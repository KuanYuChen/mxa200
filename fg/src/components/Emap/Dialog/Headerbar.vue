<!-- =================================================== 編輯頁面 - Headerbar欄位設定Dialog =================================================== -->
<template>
  <v-dialog v-model="headerbar['dialog']" width="850" persistent>
    <v-card class="headerbar-scroll">
      <v-card-title>
        <h2 style="text-align: center;margin: 10px;font-size: 40px;">修改標題欄位資訊</h2>
      </v-card-title>
      <div style="display: flex;">
        <v-menu :close-on-content-click="false" min-width="300px">
          <template #activator="{ props }">
            <v-text-field
              style="margin: 0px 15px 0px 30px;"
              v-model="headerbar['info']['background']"
              label="主標題背景顏色"
              variant="outlined"
              v-bind="props"
            />
          </template>
          <v-color-picker v-model="headerbar['info']['background']" />
        </v-menu>
        <v-menu :close-on-content-click="false" min-width="300px">
          <template #activator="{ props }">
            <v-text-field
              style="margin: 0px 30px 0px 15px;"
              v-model="headerbar['info']['color']"
              label="主標題文字顏色"
              variant="outlined"
              v-bind="props"
            />
          </template>
          <v-color-picker v-model="headerbar['info']['color']" />
        </v-menu>
      </div>
      <v-text-field v-model="headerbar['info']['title']" style="margin: 0px 30px;" label="主標題文字內容" variant="outlined" />

      <div v-for="(btnItem, index) in headerbar['info']['btn']" :key="index" style="display: flex; margin: 0px 30px;">
        <v-menu :close-on-content-click="false" min-width="300px">
          <template #activator="{ props }">
            <v-text-field
              v-model="btnItem['color']"
              label="副標題文字顏色"
              variant="outlined"
              v-bind="props"
            />
          </template>
          <v-color-picker v-model="btnItem['color']" />
        </v-menu>
        <v-text-field v-model="btnItem['text']" style="margin: 0px 15px 0px 30px;" label="副標題文字" variant="outlined" />
        <v-text-field v-model="btnItem['func']" style="margin: 0px 0px 0px 15px;" label="副標內容" variant="outlined" />
        <v-icon style="margin: 15px 0px 0px 10px;" @click="removeBtn(index)">mdi-trash-can</v-icon>
      </div>
      <v-btn style="width: 1%;margin: 0px 0px 20px 30px;" variant="outlined"  @click="addBtn()">
        <v-icon>mdi-plus</v-icon>
      </v-btn>

      <v-card-actions>
        <div style="width: 100%;display: flex;margin: 20px 0px;">
          <v-spacer></v-spacer>
          <v-btn class="actions-btn" style="color: red;" variant="outlined" @click="closeHeaderbar()">
            <h3>關閉</h3>
          </v-btn>
          <v-btn class="actions-btn" style="color: black;" variant="outlined" @click="editHeaderbar()">
            <h3>修改</h3>
          </v-btn>
          <v-spacer></v-spacer>
        </div>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>


<script>
import { useSetup } from '@/store/module/setup.js' // Pinia

export default {
  props: ["headerbar"],
  methods: {
    addBtn() {
      this.headerbar['info']['btn'] = this.headerbar['info']['btn'] ? this.headerbar['info']['btn'] : []
      if (this.headerbar['info']['btn'].length < 8) {
        this.headerbar['info']['btn'].push({ text: "Default", color: "#FFFFFF", func: "" });
      } else useSetup().showAlertDialog({ icon: "error", title: "超過最大數量" })
    },
    removeBtn(index) {
      this.headerbar['info']['btn'].splice(index, 1);
    },
    editHeaderbar() {
      this.$emit("editHeaderbar");
    },
    closeHeaderbar() {
      this.$emit("closeHeaderbar");
    },
  }
}
</script>


<style lang="scss" scoped>
.headerbar-scroll {
  overflow-y: scroll;
  max-height: 100%;
}

*::-webkit-scrollbar {
  width: 8px;
}
 
*::-webkit-scrollbar-track {
  background-color: rgb(233, 233, 233);
  -webkit-border-radius: 1px;
  border-radius: 10px;
}

*::-webkit-scrollbar-thumb {
  -webkit-border-radius: 1px;
  border-radius: 1px;
  background: #6d6d6d; 
}
</style>