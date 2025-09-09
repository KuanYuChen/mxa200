<template>
  <div>
    <div class="edit-input">
      <v-card :style="{ 'width': '100%', 'height': '100%', 'overflow': 'overlay', 'background': item.tableColor }">
        <v-card-title>
          <v-container>
            <v-row>
              <h2 :style="{'text-align': 'left', 'color': item.textColor}">{{ item.title }}</h2>
              <v-spacer></v-spacer>
              <div style="margin: 10px 5px 0px 0px;">
                <v-btn :style="{'color': item.textColor}" variant="text" @click="openDevDialog('ADD')">
                  <v-icon icon="mdi-plus" />
                </v-btn>
                <v-btn :style="{'color': item.textColor}" variant="text" @click="exportDevTable()">
                  <v-icon icon="mdi-export" />
                </v-btn>
                <input type="file" accept=".json" ref="fileInput" @change="importDevTable" style="display: none" />
                <v-btn :style="{'color': item.textColor}" variant="text" @click="triggerFileUpload">
                  <v-icon icon="mdi-import" />
                </v-btn>
              </div>
            </v-row>
            <v-row>
              <v-spacer></v-spacer>
              <v-text-field
                :style="{'max-width': '30%', 'margin': '10px 5px 10px 0px', 'color': item.textColor}"
                v-model="search"
                variant="outlined"
                density="compact"
                label="搜尋"
                single-line
                hide-details
              >
                <template v-slot:append-inner><v-icon icon="mdi-magnify" /></template>
              </v-text-field>
            </v-row>
          </v-container>
        </v-card-title>
        <v-data-table 
          :style="{ 'background': item.tableColor, 'color': item.tabletextColor }" 
          :search="search" :headers="getDevHeader" :items="item['content']" 
          hover :mobile="checkTableWidth()"
          >
          <template v-if="!componentChange" v-slot:item.actions="{ item }">
            <div class="test" style="display: flex; justify-content: end; gap: 10px;">
              <v-btn style="color: green;" variant="outlined" @click="openDevDialog('EDIT', item)"><h3>編輯</h3></v-btn>
              <v-btn style="color: red;" variant="outlined" @click="removeDevice(item)"><h3>刪除</h3></v-btn>
            </div>
          </template>
        </v-data-table>
      </v-card>
    </div>
    <v-dialog v-model="dev['dialog']" width="700">
      <v-card>
        <v-card-title>
          <h2 style="text-align: center;margin: 10px;font-size: 40px;">{{ dev['state'] == 'ADD' ? '新增' : '修改' }}資料表</h2>
        </v-card-title>
        <div v-for="(devInfo, index) in dev['info']" :key="index">
          <v-row v-if="index != 'id'">
            <v-spacer></v-spacer>
            <v-col cols="12" sm="6">
              <v-text-field v-model="dev['info'][index]" :label="index" variant="outlined"></v-text-field>
            </v-col>
            <v-spacer></v-spacer>
          </v-row>

        </div>
        <v-card-actions>
          <div style="width: 100%;display: flex;margin: 20px 0px;">
            <v-spacer></v-spacer>
            <v-btn class="actions-btn" style="color: red;" variant="outlined" @click="closeDevDialog()">
              <h3>關閉</h3>
            </v-btn>
            <v-btn class="actions-btn" style="color: black;" variant="outlined" @click="dev['state'] == 'ADD' ? addDevice() : editDevice()">
              <h3>{{ dev['state'] == 'ADD' ? '新增' : '修改' }}</h3>
            </v-btn>
            <v-spacer></v-spacer>
          </div>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import { useSetup } from '@/store/module/setup.js' // Pinia

export default {
  props: ["componentChange", "item"],
  data() {
    return {
      Setup: useSetup().$state,
      search: null,
      dev: {
        dialog: false,
        state: "ADD",
        info: {},
      }
    }
  },
  computed: {
    getDevHeader() {
      var header = JSON.parse(JSON.stringify(this.item['header']))
      header.push({ title: "", key: "actions", show: true, align: "center", sortable: false, width: "10px" })
      return header
    }
  },
  methods: {
    checkTableWidth() {
      return this.item.width > 650 ? false : true
    },
    openDevDialog(state, item) {
      this.dev['dialog'] = true;
      this.dev['state'] = state;
      for (let i in this.item['header']) this.dev['info'][this.item['header'][i]['key']] = ""
      if (state == "EDIT") {
        this.dev['info'] = JSON.parse(JSON.stringify(item))
      }
    },
    // 新增Dev設備
    addDevice() {
      this.dev['info']['id'] = Math.floor(Math.random() * 10000000)
      this.item['content'].push(this.dev['info'])
      this.closeDevDialog();
      this.Setup.editCount += 1
    },
    // 修改Dev設備
    editDevice() {
      for (let i in this.item['content']) {
        if (this.item['content'][i]['id'] == this.dev['info']['id']) {
          this.item['content'][i] = this.dev['info']
          this.closeDevDialog()
          this.Setup.editCount += 1
        }
      }
    },
    // 刪除Dev設備
    removeDevice(item) {
      for (let i in this.item['content']) {
        if (this.item['content'][i]['id'] == item['id']) {
          this.item['content'].splice(i, 1)
          this.closeDevDialog()
          this.Setup.editCount += 1
        }
      }
    },
    exportDevTable() {
      var tableData = {
        header: this.item["header"],
        content: this.item["content"]
      }
      const jsonData = JSON.stringify(tableData, null, 2); // 格式化 JSON
      const blob = new Blob([jsonData], { type: "application/json" }); // 建立 Blob 物件
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "devtable.json";
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url); // 釋放 URL
      document.body.removeChild(a);
    },
    triggerFileUpload() {
      this.$refs.fileInput.click();
    },
    importDevTable(event) {
      const file = event.target.files[0];
      if (file) {
        console.log("選擇的檔案:", file);
        const reader = new FileReader();
        reader.onload = function(event) {
          const csvContent = event.target.result; // 讀取到的文件內容
          var parseData = JSON.parse(csvContent)
          if (parseData['header'] && parseData['content']) {
            this.item['header'] = parseData['header']
            this.item['content'] = parseData['content']
          }
        };
        reader.readAsText(file);
      }
    },
    closeDevDialog() {
      this.dev['dialog'] = false;
      setTimeout(() => {
        this.dev = {
          dialog: false,
          state: "ADD",
          info: {}
        }
      }, 100);
    },
  }
}
</script>



<style lang=scss scoped>
.edit-input {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  text-align: center;
}

*::-webkit-scrollbar {
  width: 8px;
}

*::-webkit-scrollbar-thumb {
  -webkit-border-radius: 1px;
  border-radius: 1px;
  background: #6d6d6d; 
}
</style>
