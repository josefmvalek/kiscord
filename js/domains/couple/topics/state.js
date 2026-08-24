/**
 * Conversation Topics State Management
 */

let selectedTopicId = null;
let activeTopicObject = null;

export function getSelectedTopicId() {
    return selectedTopicId;
}

export function setSelectedTopicId(id) {
    selectedTopicId = id;
}

export function getActiveTopicObject() {
    return activeTopicObject;
}

export function setActiveTopicObject(obj) {
    activeTopicObject = obj;
}
