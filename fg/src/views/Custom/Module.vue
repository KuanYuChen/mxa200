<!-- =================================================== 模組設定頁面 (自訂組件) =================================================== -->
<template>
  <v-main style="background-color: rgb(233, 233, 233)">
    <div style="width: 100%; padding: 15px;">
      <ModuleTable :tableInfo="$route.params.pathnow"/>
    </div>
  </v-main>
</template>

<script>
import ModuleTable from "@/components/Module/Table.vue"

export default {
  components: { ModuleTable },
}
</script>


<style lang="scss" scoped>
// Data Table Header 
:deep(.v-data-table-header__content span) {
  font-size: 20px;
  color: rgb(36, 35, 34);
}

// Data Table Content 
:deep(.v-data-table__tr td) {
  font-size: 18px;
  color: rgb(36, 35, 34);
}
</style>