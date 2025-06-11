export class Group {
    name;
    /**
     * @type{string[]} Array of masternode keys associated to this group
     */
    masternodes;

    editable;
	constructor({name, mastenodes = [], editable = false}) {
	    this.name = name;
	    this.masternodes = masternodes;
		this.editable = editable;
    }
}
