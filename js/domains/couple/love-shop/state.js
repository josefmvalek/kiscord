/**
 * Love Shop Local State Management
 */

/** @type {'shop' | 'my_perks' | 'obligations'} */
let activeTab = 'shop';

let rpsState = {
    active: false,
    myChoice: null,
    partnerChoice: null,
    countdown: null,
    result: null
};

export function getActiveTab() {
    return activeTab;
}

export function setActiveTab(tab) {
    activeTab = tab;
}

export function getRpsState() {
    return rpsState;
}

export function resetRpsState() {
    rpsState = {
        active: false,
        myChoice: null,
        partnerChoice: null,
        countdown: null,
        result: null
    };
}
