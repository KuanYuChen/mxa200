<template>
  <v-dialog v-model="mod['dialog']" width="900" persistent>
    <v-card>
      <v-card-title>
        <h2 style="text-align: center;margin: 10px;font-size: 40px;">設定模組參數</h2>
      </v-card-title>
      <div style="display: flex;">
        <v-text-field v-model="mod['item']['title']" style="margin: 0px 15px 0px 30px;" label="設定文字" variant="outlined" />
        <!-- <v-select 
          v-model="mod['item']['icon']"
          v-model:menu="iconMenu"
          style="margin: 0px 15px 0px 10px;"
          label="設定ICON" 
          variant="outlined"
          :menu-props="{ 'max-height': '600px' }"
        >
          <template v-slot:prepend-item>
            <v-virtual-scroll :items="icon_list" height="400">
              <template v-slot:default="{ item }">
                <v-list-item :style="{ 'cursor': 'pointer', 'background': item == mod['item']['icon'] ? 'rgb(233, 233, 233)' : ''}" @click="selectIcon(mod['item'], item)">
                  <v-list-item-title class="d-flex align-center">
                    <h3>{{ item }}</h3>
                    <v-spacer></v-spacer>
                    <v-icon style="font-size: 30px;">{{ item }}</v-icon>
                  </v-list-item-title>
                </v-list-item>
              </template>
            </v-virtual-scroll>
          </template>
        </v-select> -->
        <v-text-field v-if="mod['state'] == 'ADD'" v-model="mod['item']['routename']" style="margin: 0px 30px 0px 15px;" label="設定路徑名稱" variant="outlined" />
      </div>
      <v-divider style="margin: 20px;"></v-divider>
      <h2 style="text-align: center;margin: 10px;font-size: 30px;">設定Table Header</h2>
      <div v-for="(item, index) in mod['item']['header']" :key="index">
        <div style="display: flex;">
          <v-text-field v-model="item['title']" style="margin-left: 30px;" label="標題" variant="outlined" />
          <v-text-field v-model="item['key']" style="margin-left: 30px;" label="key" variant="outlined" />
          <v-icon style="margin: 15px 10px 0px 20px;font-size: 30px;" @click="removeModHeaderInfo(index)">mdi-trash-can</v-icon>
        </div>
      </div>
      <v-btn style="width: 1%;margin: 0px 20px 20px 30px;" variant="outlined" @click="addModHeaderInfo()">
        <v-icon>mdi-plus</v-icon>
      </v-btn>
      <v-card-actions>
        <div style="width: 100%;display: flex;margin: 10px 0px 20px;">
          <v-spacer></v-spacer>
          <v-btn class="actions-btn" style="color: red;" variant="outlined" @click="closeTablePage()"><h3>關閉</h3></v-btn>
          <v-btn class="actions-btn" style="color: black;" variant="outlined" @click="mod['state'] == 'ADD' ? addTablePage() : editTablePage()">
            <h3>{{ mod['state'] == 'ADD' ? '新增' : '修改'}}</h3>
          </v-btn>
          <v-spacer></v-spacer>
        </div>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  props: ["mod", "icon_list"],
  data() {
    return {
      iconMenu: false,
    }
  },
  methods: {
    selectIcon(org, editicon) {
      org['icon'] = editicon;
      this.iconMenu = false; // 關閉選單
    },
    addModHeaderInfo() {
      this.mod['item']['header'].push({'title': '', 'key': ''})
    },
    removeModHeaderInfo(index) {
      this.mod['item']['header'].splice(index, 1)
    },
    addTablePage() {
      this.$emit("addTablePage")
    },
    editTablePage() {
      this.$emit("editTablePage")
    },
    closeTablePage() {
      this.$emit("closeTablePage")
    },
  }
}
</script>
