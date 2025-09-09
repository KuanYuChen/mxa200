<!-- 帳戶設置，區分為Admin、組織Admin 2者有不同的設定方式 -->
<template>
  <v-main style="margin: 20px 20px 0px;">
    <loadingAnimation v-if="permission == ''" :loading="loading" />
    <div v-else>
      <div style="display: flex;">
        <v-btn variant="text" @click="permission = 'admin'" :color="permission == 'admin' ? 'red' : 'black'">管理者頁面</v-btn>
        <v-btn variant="text" @click="permission = 'gadmin'" :color="permission == 'gadmin' ? 'red' : 'black'">組織Admin頁面</v-btn>
        <span style="margin-top: 8px;">(區分國網Admin、群組Admin用)</span>
      </div>
      <div v-if="permission != ''">
        <SuperAdmin v-if="permission == 'admin'"/>
        <GroupAdmin v-else/>
      </div>
    </div>
  </v-main>
</template>


<script>
import SuperAdmin from './Admin.vue'
import GroupAdmin from './GroupAdmin.vue'

import loadingAnimation from '@/components/animation/loadingAnimation.vue';
export default {
  components: { SuperAdmin, GroupAdmin, loadingAnimation },
  data() {
    return {
      permission: '',
      loading: false,
    }
  },
  created() {
    this.loading = true;
    setTimeout(() => {
      this.permission = "admin";
      this.loading = false;
    }, 100);
  }
}
</script>