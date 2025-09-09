<!-- =================================================== 歷史曲線圖 (自訂組件) =================================================== -->
<template>
  <v-main>
    <div style="display: flex; width: 100%;">
      <v-col cols="12" class="pa-0">
        <div style="margin: 0px 30px;">
          <HistoryChart />
        </div>
			</v-col>
    </div>
  </v-main>
</template>

<script>
import HistoryChart from "@/views/Linechart/HistoryChart.vue"

export default {
  components: { HistoryChart },
  data() {
    return {

    }
  }
}
</script>