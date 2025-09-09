<template>
  <v-card style="border: 1px solid #dbd7d7; border-radius: 10px;">
    <v-card-title>
      <div style="display: flex;">
        <v-btn style="margin: 10px;" variant="text" @click="openModuleDialog('ADD')">
          <v-icon style="font-size: 30px;">mdi-plus</v-icon>
        </v-btn>
        <v-spacer></v-spacer>
        <v-text-field
          style="max-width: 15%; margin: 0px 20px 10px 0px;"
          v-model="search"
          variant="outlined"
          density="compact"
          label="搜尋"
          single-line
          hide-details
        >
          <template v-slot:append-inner><v-icon icon="mdi-magnify" /></template>
        </v-text-field>
      </div>
    </v-card-title>
    <v-data-table
      style="height: 80vh;"
      :search="search"
      :headers="module_header"
      :items="module_content"
    >
      <template #no-data><h3>無資料</h3></template>
      <template v-slot:item.actions="{ item }">
        <div class="test" style="display: flex;justify-content: center;">
          <v-btn style="color: green;margin: 0px 10px;" variant="outlined" @click="openModuleDialog('EDIT', item)">
            <h3>編輯</h3>
          </v-btn>
          <v-btn style="color: red;margin: 0px 10px;" variant="outlined" @click="removeModule(item)">
            <h3>刪除</h3>
          </v-btn>
        </div>
      </template>
    </v-data-table>
  </v-card>
  <v-dialog v-model="cfg['dialog']" width="900" persistent>
    <v-card>
      <v-card-title>
        <h2 style="margin: 10px 0px 10px 10px;">{{ cfg['state'] == 'ADD' ? '新增' : '修改' }}設定</h2>
      </v-card-title>
      <div v-for="(item, index) in module_header" :key="index">
        <v-text-field  v-if="item['key'] != 'actions'"  style="margin: 0px 50px;" v-model="cfg['item'][item['key']]" :label="item['title']" variant="outlined"/>
      </div>
      <v-card-actions>
        <div style="width: 100%;display: flex;margin: 10px 0px 20px;">
          <v-spacer></v-spacer>
          <v-btn class="actions-btn" style="color: red;" variant="outlined" @click="closeModuleConfig()">
            <h3>關閉</h3>
          </v-btn>
          <v-btn class="actions-btn" style="color: black;" variant="outlined" @click="cfg['state'] == 'ADD' ? addModule() : editModule()">
            <h3>{{ cfg['state'] == 'ADD' ? '新增' : '修改'}}</h3>
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
  props: [ 'tableInfo' ],
  data() {
    return {
      Setup: useSetup().$state,
      search: null,
      modPageID: 0,
      module_header: [],
      module_content: [],
      cfg: {
        dialog: false,
        state: "ADD",
        item: {},
      }
    }
  },
  created() {
    this.getModuleInfo()
  },
  methods: {
    getModuleInfo() {
      // this.modPageID = this.$route.params.pathnow
      var Query = { id: 1, table: this.tableInfo }
      useSetup().getIDData(Query).then((res)=> {
        var data = res["data"]
        var header = JSON.parse(data["header"])
        var content = JSON.parse(data["content"])
        this.module_header = header
        this.module_header.push({ title: "", key: "actions", align: "center", sortable: false, width: "10px" })
        this.module_content = content
        console.log(this.module_header, this.module_content, this.$route)
      })
    },
    openModuleDialog(state, item) {
      this.cfg['dialog'] = true;
      this.cfg['state'] = state;
      if (state == 'EDIT') {
        this.cfg["item"] = JSON.parse(JSON.stringify(item))
      }
    },
    addModule() {
      this.cfg['item']['id'] = Math.floor(Math.random() * 1000000)
      this.module_content.push(this.cfg['item'])
      console.log(this.module_content)
      this.updateModule();
    },
    editModule() {
      for (let i in this.module_content) {
        var content = this.module_content[i]
        if (content['id'] == this.cfg["item"]['id']) {
          Object.assign(content, this.cfg["item"]);
          this.updateModule();
        }
      }
    },
    removeModule(item) {
      for (let i in this.module_content) {
        var content = this.module_content[i]
        if (content['id'] == item['id']) {
          this.module_content.splice(i, 1);
          this.updateModule();
        }
      }
    },
    // 更新module資料
    updateModule() {
      // header要把actions(按鈕欄位)刪掉
      var cpy_header = JSON.parse(JSON.stringify(this.module_header))
      for (let i in cpy_header) {
        if (cpy_header[i]['key'] == 'actions') cpy_header.splice(i, 1)
      }
      var Query = { 
        id: 1,
        table: this.tableInfo,
        data: { header: JSON.stringify(cpy_header), content: JSON.stringify(this.module_content) }
      }
      useSetup().editIDData(Query).finally(()=> this.closeModuleConfig())
    },
    closeModuleConfig() {
      this.cfg['dialog'] = false;
      this.cfg['item'] = {};
    }
  }
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