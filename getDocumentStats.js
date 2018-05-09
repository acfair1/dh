// import required modules/files
const fs = require('fs');
//import axios from 'axios';
const axios = require('axios');
const log4js = require('log4js');
const parseArgs = require('minimist');
const settings = require('./config');
const { logging } = settings;
const readline = require('readline');
const Summarize = require('./Summarize.js');

// get command line arguments
// example:
// node getDocumentStats.js -a 1 -e stats -f /opt/dh/mongoIds/mongoIds.txt
const argv = parseArgs(process.argv.slice(2));
// -a API to use
const apiNum = argv.a;
// -e name extension to use
const ext = argv.e;
// -f filepath for mongoIds
const idsPath = argv.f;


// get configuation settings
const { general } = settings;
const paths = general.pathRelative;
const config = {
    breakOnError: false,
    logFile: `${paths.logPath}/stats.${ext}.log`,
    docStatsFile: `${paths.docStatsPath}/docStats.${ext}.txt`,
    errFile: `${paths.errPath}/err.stats.${ext}.txt`,
    idsFilePath: `${idsPath}/mongoIds.${ext}.txt`,
    username: `stats${general.userRoot}`,
    password: general.password,
    apiUrl: apiNum == 1
        ? settings.api.url1 : apiNum == 2
            ? settings.api.url2 : apiNum == 3
                ? settings.api.url3 : apiNum == 4
                    ? settings.api.url4 : apiNum == 5
                        ? settings.api.url5 : apiNum == 6
                            ? settings.api.url6 : settings.api.url7,
    docRoute: settings.api.routes.doc,
    loginRoute: settings.api.routes.login,
    testRoute: settings.api.routes.gradeCount,
    limit: general.statsLimit
};

logging.appenders.app.filename = config.logFile;
log4js.configure(logging);
const log = log4js.getLogger("stats");

// variables
let docCounter = 0;
let token = '';
axios.defaults.baseURL = config.apiUrl;

/**
 * writeLogHeader - Writes the application header information to the log.
 *
 * @returns {boolean} Always returns true.
 */
var writeLogHeader = async () => {
    await log.info("--------------------------------------------------------------------------------");
    await log.info(`-------------------------- Document Stats Application --------------------------`);
    await log.info("--------------------------------------------------------------------------------");
    await log.info(`-- API Host: ${config.apiUrl}`);
    await log.info(`-- Transaction Limit: ${config.limit}`);
    await log.info(`-- User: ${config.username}`);
    await log.info(`-- Processing: Stats ${ext}`);
    await log.info(`-- Mongo Ids File: ${config.idsFilePath}`);
    await log.info(`-- Output File: ${config.docStatsFile}`);
    await log.info("--------------------------------------------------------------------------------");
    return true;
};

/**
 * getTime
 * @returns {Date} Returns new Date instance.
 */
var getTime = function () {
    return new Date();
};

var getApiToken = async () => {
    log.info("Getting API Token");
    var success = false;
    try {
        var tbody = {
            username: config.username,
            password: config.password
        };
        var login = await axios.post(config.loginRoute, tbody);
        if (!login.data && !login.data.token) {
            if (config.breakOnError) {
                throw new Error("No login data returned.");
            } else { log.error("No login data returned."); }
        } else if (login.status && login.status == 200) {
            log.info("Successfully logged in.");
            token = `JWT ${login.data.token}`;
            axios.defaults.headers.common['Authorization'] = token;
            success = true;
        } else if (login.status) {
            log.error(`Error while logging in.  Status code: '${login.status}'`);
        }
    } catch (err) {
        log.error("Unable to login.", err);
    }
    return success;
};

var testApiRoute = async () => {
    log.info("Testing API Route");
    var success = false;
    try {
        var gradeCount = await axios.get(config.testRoute);
        if (gradeCount.data.count) {
            log.info('API Route Test Successful');
            success = true;
        }
    } catch (err) {
        log.error('Cannot reach API', err);
    }
    return success;
};

var initProgram = async () => {
    log.info("Starting program.");
    var success = false;
    success = await getApiToken();
    if (success) {
        success = await testApiRoute();
    }
    return success;
};

var pauseFor2Minutes = function () {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve('resolved');
        }, 120000);
    });
};

var success = 0;
var error = 0;

var getDocument = async function (mongoId) {
    docCounter++;
    let ccd = null;
    try {
        const dGet = await axios.get(`${config.docRoute}?mongoId=${mongoId}`, {
            headers: { 'Content-Type': 'application/json' }
        });

        if (dGet.data) {
            if (dGet.data.document) {
                ccd = dGet.data.document;
            }
            else {
                ccd = JSON.parse(dGet.data);
            }
        }
    }
    catch (err) {
        if (err) {
            if (String(err).indexOf('socket hang up') > -1 || String(err).indexOf('connect ECONNREFUSED') > -1) {
                await log.warn(`Connection Refused.`);
                await log.warn(`Pausing program for 2 minutes incase of API restart, and retrying.`);
                await pauseFor2Minutes();
                docCounter--;
                await getDocument(mongoId);
            }
        }
    }
    if (ccd === null) { error++; }
    else { success++; }
    log.info(`success: ${success}  error: ${error}`);
    return ccd;
};

var createSummary = async function (ccd) {
    let doc = ccd;
    if (ccd !== null) {
        doc = await Summarize.Summarize(ccd, { audit: true });
    }
    return doc;
};

var writeData = function (ccd) {
    if (success === 1) {
        let headers = 'Document Id|Institution Name|MRN|C-CDA Type|SectionName|Count|Score|Denominator|Numerator|Violations|Quality Measure|Quality Compliance|Original|Transformed';
        headers = headers.replace(/\|$/gm, '');
        headers += '\r\n';
        fs.writeFileSync(config.docStatsFile, headers);
    }
    let write = '';
    const mongoId = String(ccd.mongoId);
    const mrn = String(ccd.mrn);

    let institutionName = '';
    if (ccd.document.custodians.length > 0) { institutionName = String(ccd.document.custodians[0].institutionName); }

    let ccdType = '';
    for (var ty in ccd.document.type) {
        if (ccd.document.type.hasOwnProperty(ty)) {
            if (ccd.document.type[ty]) {
                let typeStr = '';
                if (ty === 'continuity_of_care_document') { typeStr = 'CCD'; }
                else if (ty === 'discharge_summary') { typeStr = 'DS'; }
                else if (ty === 'referral_note') { typeStr = 'RN'; }
                else if (ty === 'consultation_note') { typeStr = 'CN'; }
                ccdType = `${ccd.document.type[ty]} ${typeStr}`;
                break;
            }
        }
    }
    const lineBase = `${mongoId}|${institutionName}|${mrn}|${ccdType}|`;

    let compStr = 'Completeness|';
    if (ccd.completeness.count) { compStr += `${ccd.completeness.count}|`; }
    else { compStr += `|`; }
    if (ccd.completeness.score) { compStr += `${ccd.completeness.score}|`; }
    else { compStr += `|`; }
    if (ccd.completeness.denominator) { compStr += `${ccd.completeness.denominator}|`; }
    else { compStr += `|`; }
    if (ccd.completeness.numerator) { compStr += `${ccd.completeness.numerator}|`; }
    else { compStr += `|`; }
    if (ccd.completeness.violations) { compStr += `${ccd.completeness.violations}|`; }
    else { compStr += `|`; }

    write = `${lineBase}${compStr}`.replace(/\|$/gm, '');
    write += '\r\n';
    fs.appendFileSync(config.docStatsFile, write);

    let contStr = 'Content|';
    if (ccd.content.count) { contStr += `${ccd.content.count}|`; }
    else { contStr += `|`; }
    if (ccd.content.score) { contStr += `${ccd.content.score}|`; }
    else { contStr += `|`; }
    if (ccd.content.denominator) { contStr += `${ccd.content.denominator}|`; }
    else { contStr += `|`; }
    if (ccd.content.numerator) { contStr += `${ccd.content.numerator}|`; }
    else { contStr += `|`; }
    if (ccd.content.violations) { contStr += `${ccd.content.violations}|`; }
    else { contStr += `|`; }

    write = `${lineBase}${contStr}`.replace(/\|$/gm, '');
    write += '\r\n';
    fs.appendFileSync(config.docStatsFile, write);

    if (ccd && ccd.algo && ccd.algo.quality) {
        for (var qm in ccd.algo.quality) {
            if (ccd.algo.quality.hasOwnProperty(qm) && qm !== "stratification") {
                const compliance = String(ccd.algo.quality[qm].compliance);
                const qmStr = `||||||${qm}|${compliance}`;
                write = `${lineBase}${qmStr}`;
                write += '\r\n';
                if (compliance !== "NA") {
                    fs.appendFileSync(config.docStatsFile, write);
                }
            }
        }
    }
    const skipSections = ['equipment', 'goals', 'interventions', 'payers', 'statusAssessments'];
    for (var ky in ccd.summary.entries) {
        if (skipSections.indexOf(ky) === -1) {
            if (ccd.summary.entries.hasOwnProperty(ky)) {
                let entStr = '';
                let entTyp = '';
                switch (ky) {
                    case 'allergies':
                        entTyp = 'Allergies';
                        break;
                    case 'encounters':
                        entTyp = 'Encounters';
                        break;
                    case 'immunizations':
                        entTyp = 'Immunizations';
                        break;
                    case 'medications':
                        entTyp = 'Medications';
                        break;
                    case 'planOfCare':
                        entTyp = 'Plan of Care';
                        break;
                    case 'problems':
                        entTyp = 'Problems';
                        break;
                    case 'procedures':
                        entTyp = 'Procedures';
                        break;
                    case 'results':
                        entTyp = 'Results';
                        break;
                    case 'socialHistory':
                        entTyp = 'Social History';
                        break;
                    case 'vitalSigns':
                        entTyp = 'Vital Signs';
                        break;
                    default:
                        entTyp = ky;
                    //case 'equipment':
                    //    entTyp = 'Equipment';
                    //    break;
                    //case 'goals':
                    //    entTyp = 'Goals';
                    //    break;
                    //case 'interventions':
                    //    entTyp = 'Interventions';
                    //    break;
                    //case 'payers':
                    //    entTyp = 'Payers';
                    //    break;
                    //case 'statusAssessments':
                    //    entTyp = 'Status Assessments';
                    //    break;
                }

                let original = 0;
                let transformed = 0;
                if (String(ccd.summary[ky].normalize.original) !== "NA") {
                    original = Math.round(Number(ccd.summary[ky].normalize.original.replace(/%/, '')) * Number(ccd.summary.entries[ky]) / 100, 0);
                }
                if (String(ccd.summary[ky].normalize.transformed) !== "NA") {
                    transformed = Math.round(Number(ccd.summary[ky].normalize.transformed.replace(/%/, '')) * Number(ccd.summary.entries[ky]) / 100, 0);
                }

                entStr += `${entTyp}|${ccd.summary.entries[ky]}|||||||${original}|${transformed}`;
                write = `${lineBase}${entStr}`;
                write += '\r\n';
                fs.appendFileSync(config.docStatsFile, write);
            }
        }
    }
};

const ids = [];

var loadLines = function () {
    return new Promise(resolve => {
        let index = 0;
        const lineReader = readline.createInterface({
            input: fs.createReadStream(config.idsFilePath)
        });

        lineReader.on('line', function (line) {
            if (index < config.limit) {
                if (line.length === 24) {
                    index++;
                    ids.push(String(line));
                }
            }
        });

        lineReader.on('close', function () {
            log.info(`ids.length=${ids.length}`);
            resolve('resolved');
        });
    });
};

var runLoop = async () => {
    let i = 0;
    const idArr = ids;
    await log.info(`idArr.length=${idArr.length}`);
    while (i < idArr.length && docCounter < config.limit) {
        var time = await getTime();
        if (time.getMinutes() === 59) {
            await log.info(`Pausing program for 2 minutes to enable API restart.`);
            await pauseFor2Minutes();
        }
        var id = idArr[i];
        let doc = await getDocument(id);
        doc = await createSummary(doc);
        if (doc !== null) {
            await writeData(doc);
        }
        i++;
    }
};

var runAll = async () => {
    await writeLogHeader();
    await loadLines();
    var loginSuccess = false;
    loginSuccess = await initProgram();
    if (loginSuccess) {
        await runLoop();
    }
    await log.info("Program complete.");
};

process
    .on('SIGTERM', function () {
        log.info("SIGTERM Received.  Exiting App.");
        process.exit(0);
    })
    .on('SIGINT', function () {
        log.info("SIGINT Received.  Exiting App.");
        process.exit(0);
    });


runAll();
