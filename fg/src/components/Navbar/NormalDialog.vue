<template>
  <v-dialog v-model="org['dialog']" width="900" persistent>
    <v-card>
      <v-card-title>
        <h2 style="text-align: center;margin: 10px;font-size: 40px;">設定路徑命名</h2>
      </v-card-title>
      <div style="display: flex;">
        <v-text-field v-model="org['item']['title']" style="margin: 0px 15px 0px 30px;" label="設定路徑名稱" variant="outlined" />
        <v-text-field v-if="org['state'] == 'ADD'" v-model="org['item']['routename']" style="margin: 0px 30px 0px 15px;" label="設定路徑名稱" variant="outlined" />
      </div>
      <v-card-actions>
        <div style="width: 100%;display: flex;margin: 10px 0px 20px;">
          <v-spacer></v-spacer>
          <v-btn class="actions-btn" style="color: red;" variant="outlined" @click="closeNormalPage()"><h3>關閉</h3></v-btn>
          <v-btn class="actions-btn" style="color: black;" variant="outlined" @click="org['state'] == 'ADD' ? addNormalPage() : editNormalPage()">
            <h3>{{ org['state'] == 'ADD' ? '新增' : '修改'}}</h3>
          </v-btn>
          <v-spacer></v-spacer>
        </div>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  props: ["org"],
  methods: {
    addNormalPage() {
      this.$emit("addNormalPage")
    },
    editNormalPage() {
      this.$emit("editNormalPage")
    },
    closeNormalPage() {
      this.$emit("closeNormalPage")
    },
  }
}
</script>
