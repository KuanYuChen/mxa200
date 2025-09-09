<!-- =================================================== 編輯頁面 - 導覽抽屜欄位設定Dialog =================================================== -->
<template>
  <v-dialog v-model="navbar['dialog']" width="900" persistent>
    <v-card class="navigation-scroll">
      <v-card-title>
        <h2 style="text-align: center;margin: 10px;font-size: 40px;">修改導覽列資訊</h2>
      </v-card-title>
      <div style="display: flex;">
        <v-menu :close-on-content-click="false" min-width="300px">
          <template #activator="{ props }">
            <v-text-field
              style="margin: 0px 30px;"
              v-model="navbar['info']['background']"
              label="導覽列背景顏色"
              variant="outlined"
              v-bind="props"
            />
          </template>
          <v-color-picker v-model="navbar['info']['background']" />
        </v-menu>
      </div>
      <div v-for="(btnItem, index) in navbar['info']['btn']" :key="index" style="margin: 0px 30px;">
        <div style="width: 100%; display: flex;">
          <div style="width: 95%;">
            <v-row>
              <v-col style="padding: 10px 0px 0px 10px;">
                <v-menu :close-on-content-click="false" min-width="300px">
                  <template #activator="{ props }">
                    <v-text-field
                      v-model="btnItem['color']"
                      style="margin: 0px 20px 0px 0px;"
                      label="文字顏色"
                      variant="outlined"
                      v-bind="props"
                    />
                  </template>
                  <v-color-picker v-model="btnItem['color']" />
                </v-menu>
              </v-col>
              <v-col style="padding: 10px 0px 0px 0px;">
                <v-text-field v-model="btnItem['text']" style="margin: 0px 15px 0px 10px;" label="文字名稱" variant="outlined" />
              </v-col>
              <v-col style="padding: 10px 0px 0px 10px;">
                <v-text-field v-model="btnItem['func']" style="margin: 0px 20px 0px 0px;" label="文字命令" variant="outlined" />
              </v-col>
            </v-row>
            <v-row>
              <!-- <v-col style="padding: 10px 0px 0px 0px;">
                <v-select 
                  v-model="btnItem['icon']"
                  v-model:menu="btnItem['menu']"
                  style="margin: 0px 15px 0px 10px;"
                  label="設定LOGO" 
                  variant="outlined"
                  :menu-props="{ 'max-height': '400px' }"
                >
                  <template v-slot:prepend-item>
                    <v-virtual-scroll :items="Setup.icon_list" height="400">
                      <template v-slot:default="{ item }">
                        <v-list-item :style="{ 'cursor': 'pointer', 'background': item == btnItem['icon'] ? 'rgb(233, 233, 233)' : ''}" @click="selectIcon(btnItem, item)">
                          <v-list-item-title class="d-flex align-center">
                            <h3>{{ item }}</h3>
                            <v-spacer></v-spacer>
                            <v-icon style="font-size: 30px;">{{ item }}</v-icon>
                          </v-list-item-title>
                        </v-list-item>
                      </template>
                    </v-virtual-scroll>
                  </template>
                </v-select>
              </v-col> -->
            </v-row>
          </div>
          <div style="width: 5%;">
            <v-icon style="margin: 10px 50px 0px 10px; font-size: 30px;" @click="removeBtn(index)">mdi-trash-can</v-icon>
          </div>
        </div>
        <v-divider style="width: 100%; margin: 20px 0px 30px;"></v-divider>
      </div>
      <v-btn style="width: 1%;margin: 0px 0px 20px 30px;" variant="outlined" @click="addBtn()">
        <v-icon>mdi-plus</v-icon>
      </v-btn>

      <v-card-actions>
        <div style="width: 100%;display: flex;margin: 10px 0px 20px;">
          <v-spacer></v-spacer>
          <v-btn class="actions-btn" style="color: red;" variant="outlined" @click="closeNavbar()">
            <h3>關閉</h3>
          </v-btn>
          <v-btn class="actions-btn" style="color: black;" variant="outlined" @click="editNavbar()">
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
  props: ["navbar"],
  data() {
    return {
      Setup: useSetup(),
    }
  },
  methods: {
    selectIcon(org, editicon) {
      org['icon'] = editicon;
      org['menu'] = false; // 關閉選單
    },
    addBtn() {
      this.navbar['info']['btn'] = this.navbar['info']['btn'] ? this.navbar['info']['btn'] : []
      this.navbar['info']['btn'].push({ text: "Default", color: "#569981", func: "", icon: "" });
    },
    removeBtn(index) {
      this.navbar['info']['btn'].splice(index, 1);
    },
    editNavbar() {
      this.$emit("editNavbar");
    },
    closeNavbar() {
      this.$emit("closeNavbar");
    },
  }
}
</script>


<style lang="scss" scoped>
.navigation-scroll {
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