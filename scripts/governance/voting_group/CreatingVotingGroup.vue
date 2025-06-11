<script setup>
import {translation} from '../../i18n.js'
import { computed, ref, watch } from 'vue'
 import Modal from '../../Modal.vue';

const emit = defineEmits(['close']);
 
const availableMasternodes = ref([
	{ addr: 'mn1' },
	{ addr: 'mn2' },
	{ addr: 'mn3' },
	{ addr: 'mn4' },
	{ addr: 'mn5' },
	// … your real list
])

const groupName = ref('')
const mode = ref('count')
const mnCount = ref(1)
const selectedMNs = ref([])

const selectedMasternodes = computed(() => {
	if (mode.value === 'manual') {
		return selectedMNs.value
	} else {
		return availableMasternodes.value.slice(0, mnCount.value).map(mn => mn.addr)
	}
})

const voteWeightPercent = computed(() => {
	if (availableMasternodes.value.length === 0) return 0
	return ((selectedMasternodes.value.length / availableMasternodes.value.length) * 100).toFixed(1)
})

function saveGroup() {
	if (!groupName.value.trim()) {
		alert('Group name is required')
		return
	}
	// Save logic here
	console.log('Saved group:', {
		name: groupName.value,
		mnList: selectedMasternodes.value,
		weight: voteWeightPercent.value,
	})
}
</script>

<template>
	<Modal :show="true">
		<template #header>
		    {{translation.createGroup}}
		    <div @click="emit('close')">CLOSE</div>
		</template>
		<template #body>
			<div class="p-4 max-w-3xl mx-auto space-y-6 flex flex-column">

				<!-- Group Name Input -->
				<div>
					<label class="block text-sm font-medium mb-1">{{translation.groupName}}</label>
					<input v-model="groupName" type="text" class="w-full border border-gray-300 rounded px-3 py-2"
						:placeholder="translation.groupNamePlaceholder" />
				</div>

				<!-- Selection Mode -->
				<div class="p-4">
					<label class="block text-sm font-medium mb-1">{{translation.selectMasternodeBy}}</label>
					<div class="space-x-4 flex flex-row">
						<label>
							<input type="radio" value="count" v-model="mode" />
							{{translation.selectMasternodeAuto}}
						</label>
						<label>
							<input type="radio" value="manual" v-model="mode" />
							{{translation.selectMasternodeManual}}
						</label>
					</div>
				</div>

				<!-- Auto Count Input -->
				<div v-if="mode === 'count'">
					<label class="block text-sm font-medium mt-4 mb-1">{{translation.selectMasternodeNumber}}</label>
					<input type="number" min="1" :max="availableMasternodes.length" v-model.number="mnCount"
						class="w-full border border-gray-300 rounded px-3 py-2" />
				</div>

				<!-- Manual MN Selector -->
				<div v-if="mode === 'manual'">
					<label class="block text-sm font-medium mt-4 mb-2">{{translation.selectMasternodes}}</label>
					<div class="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto border border-gray-200 p-2 rounded">
						<div v-for="mn in availableMasternodes" :key="mn.addr" class="flex items-center gap-2">
							<input type="checkbox" :id="mn.addr" v-model="selectedMNs" :value="mn.addr" />
							<label :for="mn.addr" class="text-sm font-mono">{{ mn.addr }}</label>
						</div>
					</div>
				</div>

				<!-- Summary -->
				<div class="text-sm text-gray-700">
					<p><strong>{{translation.selectedMasternode}}</strong> {{ selectedMasternodes.length }}</p>
					<p><strong>{{translation.voteWeight}}</strong> {{ voteWeightPercent }}%</p>
				</div>

				<!-- Actions -->
				<div class="pt-4">
					<button class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700" @click="saveGroup">
						{{translation.saveGroup}}
					</button>
				</div>
			</div>
		</template>
	</Modal>
</template>
