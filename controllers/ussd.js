/**
 *Retrieves a session from the session store based on the session ID
 * @param {Object} sessionStore
 * @param {string} sessionId
 * @returns {Promise<object>}
 * **/
const {fetchOffersInRange} = require("../model/offers");

function getSession(sessionStore, sessionId) {
    return new Promise((resolve, reject) => {
        sessionStore.get(sessionId, (err, session) => {
            if (err) {
                reject(err)
            } else {
                resolve(session)
            }
        })
    })
}

/**
 *Create a session with the provided details
 * @param {Object} sessionStore
 * @param {string} sessionId
 * @param {Object} sessionObj
 * @returns {Promise}
 * **/
function setSession(sessionStore, sessionId, sessionObj) {
    return new Promise((resolve, reject) => {
        sessionStore.set(sessionId, sessionObj, (err) => {
            if (err) {
                reject(err)
            } else {
                resolve()
            }
        })
    })
}

/**
 *Processes what the user has provided
 * @param {string} userInput
 * @param {string} menu
 * @param {Object} session
 * @returns {Promise}
 * **/
async function processUSSD(userInput, menu, session) {
    try {
        const menuOption = await validateInput(menu, userInput, session);
        return await generateMenuResponse(
            menuOption === "invalid" ? menu : menuOption,
            menuOption === "invalid", userInput, session
        );
    } catch (error) {
        return {
            menuOption: "main",
            response: "END Error! Please try again",
            error:error
        };
    }
}

/**
 *Validate what the user has provided
 * @param {string} currentOption
 * @param {string} userInput
 * @param {object} session
 * @returns {promise}
 * **/
async function validateInput(currentOption, userInput, session) {
    const regex = /^\d+$/;
    if ( currentOption !== "*" && !regex.test(userInput)) {
        // Invalid input, ask again
        return 'invalid';
    }
    switch (currentOption) {
        case '*':
            return "askAmount";

        case 'askAmount':
            return "availableOffers";

        case 'availableOffers':
            switch (userInput) {
                case '0':
                    return "askAmount";
                case '98':
                    return "moreOffers";
            }
            if(!(userInput >= 0 && userInput < session.offers.length))
                return 'invalid'

            return "confirmSelectOffer";

        case 'moreOffers':
            return "confirmSelectOffer";

        case 'confirmSelectOffer':
            switch (userInput) {
                case '0':
                    return "return";
                case '1':
                    return "save";
                case '2':
                    return "dont_save";
            }
    }
}

/**
 *Generated user response based on what the user has provided
 * @param {string} menuOption
 * @param {boolean} isInvalid
 * @param {string} userInput
 * @param {Object} session
 * @returns {promise}
 * **/
async function generateMenuResponse(menuOption, isInvalid, userInput, session) {
    // Initialize the response variables
    let menuText;
    let menuOptions = {};

    // Generate the appropriate menu based on the current menu option
    switch (menuOption) {
        case 'askAmount':
            menuText = 'CON How much do you wish to spend?';
            menuOptions = {};
            break;

        case 'availableOffers':
            menuText =
                'CON Available Offers \n';
            menuOptions = await processOffers(userInput, session);
            break;

        case 'moreOffers':
            menuText = 'CON More Offers \n';
            menuOptions = await getMoreOffers();
            break;

        case 'confirmSelectOffer':
            menuText = `END You are about to subscribed to ${await selectedOffer(userInput, session)}. Confirm?`;
            menuOptions = { '1': 'Yes', '2': 'No', '0': 'Back' };
            break;

        case 'save':
            menuText = 'END Successful. You have subscribed to an offer. Thank you!';
            break;

        case 'dont_save':
            menuText = 'END Offer selection Canceled. Thank you!';
            break;

        default:
            menuText = 'END Invalid input. Please try again.';
            break;
    }

    // Generate the USSD response
    let response = isInvalid?"Invalid input, try again\n"+menuText:menuText;
    const optionKeys = Object.keys(menuOptions);
    if (optionKeys.length > 0) {
        response += '\n' + optionKeys.map((key) => `${key}. ${menuOptions[key]}`).join('\n');
    }

    return Promise.resolve({
        menuOption: menuOption,
        response: response
    });
}

/**
 *Generated user response based on what the user has provided
 * @param {string} userInput
 * @param {object} session
 * @returns {promise}
 * **/

async function processOffers(userInput, session){
    const offers = await fetchOffersInRange(userInput);
    session.offers = offers;
    // Map the offers to JSON objects with index+1 as keys and offer names as values
    return  offers.reduce((result, offer, index) => {
        result[index + 1] = `${offer.resource} ${offer.description} @ Ksh ${offer.amount}`;
        return result;
    }, {});
}

/**
 *Generated user response based on what the user has provided
 * @param {string} userInput
 * @param {object} session
 * @returns {promise}
 * **/

async function selectedOffer(userInput, session){
    const adjustedIndex = userInput - 1;
    const offer = session.offers[adjustedIndex];
    return `${offer.resource} ${offer.description} @ Ksh ${offer.amount}`;
}
module.exports = { getSession, setSession, processUSSD };