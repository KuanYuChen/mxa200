<template>
	<v-main>
		<div style="display: flex; width: 100%;">
			<v-col cols="1">
        <v-tabs
          v-model="pageType"
          color="primary"
          direction="vertical"
        >
          <v-tab prepend-icon="mdi-account" text="即時曲線圖" value="realtime" @click="seletePage('realtime')"></v-tab>
          <v-tab prepend-icon="mdi-lock" text="歷史曲線圖" value="history" @click="seletePage('history')"></v-tab>
        </v-tabs>
			</v-col>
			<v-col cols="11" class="pa-0">
				<div v-if="pageType == 'realtime'" style="margin: 0px 30px;">
          <AnimationChart />
        </div>
        <div v-else style="margin: 0px 30px;">
          <HistoryChart />
        </div>
			</v-col>
		</div>
	</v-main>
</template>

<script>
import AnimationChart from "@/views/Linechart/AnimationChart.vue"
import HistoryChart from "@/views/Linechart/HistoryChart.vue"
import { useSetup } from '@/store/module/setup';

export default {
	components: {
		AnimationChart, HistoryChart
	},
	data() {
		return {
      Setup: useSetup().$state,
			pageType: "realtime"
		}
	},
  methods: {
    seletePage(type) {
      this.pageType = type
      clearInterval(this.Setup.animateChartInterval)
      this.Setup.animateChartInterval = null;
    }
  }
}
</script>