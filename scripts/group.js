export class Group {
    name;
    /**
     * @type{string[]} Array of masternode keys associated to this group
     */
    masternodes;

    editable;
    constructor({ name, masternodes = [], editable = false }) {
        this.name = name;
        this.masternodes = masternodes;
        this.editable = editable;
    }

    mnNumber() {
        return this.masternodes.length;
    }
}
