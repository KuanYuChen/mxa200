<template>
  <v-dialog v-model="config['dialog']" width="900" persistent>
    <v-card>
      <v-card-title>
        <h2 style="text-align: center;margin: 10px;font-size: 40px;">修改Navbar參數</h2>
      </v-card-title>
      <v-text-field v-model="config['item']['title']" style="margin: 0px 15px 0px 10px;" label="設定編輯頁名稱" variant="outlined" />
      <!-- <v-select 
        v-model="config['item']['icon']"
        v-model:menu="iconMenu"
        style="margin: 0px 15px 0px 10px;"
        label="設定ICON" 
        variant="outlined"
        :menu-props="{ 'max-height': '400px' }"
      >
        <template v-slot:prepend-item>
          <v-virtual-scroll :items="icon_list" height="400">
            <template v-slot:default="{ item }">
              <v-list-item :style="{ 'cursor': 'pointer', 'background': item == config['item']['icon'] ? 'rgb(233, 233, 233)' : ''}" @click="selectIcon(config['item'], item)">
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
      <v-card-actions>
        <div style="width: 100%;display: flex;margin: 10px 0px 20px;">
          <v-spacer></v-spacer>
          <v-btn class="actions-btn" style="color: red;" variant="outlined" @click="closeNavDialog()">
            <h3>關閉</h3>
          </v-btn>
          <v-btn class="actions-btn" style="color: black;" variant="outlined" @click="editNavInfo()">
            <h3>修改</h3>
          </v-btn>
          <v-spacer></v-spacer>
        </div>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>


<script>
export default {
  props: ["config", "icon_list"],
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
    editNavInfo() {
      this.$emit("editNavInfo")
    },
    closeNavDialog() {
      this.$emit("closeNavDialog")
    },
  }
}
</script>
