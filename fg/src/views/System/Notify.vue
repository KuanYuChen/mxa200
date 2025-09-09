<template>
  <v-main>
    <v-card style="margin: 15px;">
      <v-card-title style="padding: 30px 0px 10px 30px;">
        <div style="display: flex;">
          <v-spacer></v-spacer>
          <v-btn style="margin-right: 10px;" variant="text" @click="openNotifyConfig('ADD')">
            <h3>新增推播群組</h3>
          </v-btn>
          <v-text-field style="max-width: 15%; margin: 0px 20px 10px 0px;" v-model="tableSearch" variant="outlined"
            density="compact" label="搜尋" append-inner-icon="mdi-magnify" single-line hide-details />
        </div>
      </v-card-title>
      <v-data-table class="organize_table_class" :search="tableSearch" :headers="notify_header" :items="notify_list"
        :mobile="Setup.isPhone" hover item-value="uuid" :custom-filter="customSearch">
        <template v-slot:item.mail.target="{ item }">
          <span style="font-size: 20px; color: rgb(36, 35, 34);" v-html="setTargetText(item.mail)"></span>
        </template>
        <template v-slot:item.sms.target="{ item }">
          <span style="font-size: 20px; color: rgb(36, 35, 34);" v-html="setTargetText(item.sms)"></span>
        </template>
        <template v-slot:item.teams.target="{ item }">
          <span style="font-size: 20px; color: rgb(36, 35, 34);" v-html="setTargetText(item.teams)"></span>
        </template>
        <template v-slot:item.line.target="{ item }">
          <span style="font-size: 20px; color: rgb(36, 35, 34);" v-html="setTargetText(item.line)"></span>
        </template>
        <template v-slot:item.actions="{ item }">
          <div class="test" style="display: flex; justify-content: end; gap: 10px;">
            <v-btn style="color: green; font-size: 18px;" variant="outlined" @click="openNotifyConfig('EDIT', item)">編輯</v-btn>
            <v-btn style="color: red; font-size: 18px;" variant="outlined" @click="removeNotify(item)">刪除</v-btn>
          </div>
        </template>
      </v-data-table>
    </v-card>
  </v-main>
  <v-dialog v-model="notify['dialog']" width="1000" persistent>
    <v-card>
      <v-card-title>
        <div style="display: flex; margin: 10px 0px;">
          <v-spacer></v-spacer>
          <h2>推播通知群組設定</h2>
          <v-spacer></v-spacer>
        </div>
      </v-card-title>
      <v-text-field style="margin: 0px 30px;" v-model="notify['item']['name']" label="群組名稱" variant="outlined"
        density="comfortable" />
      <div style="display: flex; margin: 0px 30px;">
        <v-radio-group v-model="notify.type" inline>
          <v-radio label="Email" value="mail" />
          <v-radio label="SMS" value="sms" />
          <v-radio label="Teams" value="teams" />
          <v-radio label="Line" value="line" />
        </v-radio-group>
      </div>

      <v-switch style="margin: 0px 0px 20px 40px;" v-model="notify['item'][notify.type]['enable']" color="primary" inset
        hide-details density="comfortable">
        <template v-slot:label>
          <h2 style="font-size: 25px;">{{ notify['item'][notify.type]['enable'] ? '啟用' : '禁用' }}</h2>
        </template>
      </v-switch>
      <div v-for="(info, index) in notify['item'][notify.type]['target']" :key="index">
        <div style="display: flex; margin: 0px 30px 15px;">
          <v-text-field style="width: 50%;" v-model="notify['item'][notify.type]['target'][index]"
            :label="setLableType(notify.type)" variant="outlined" density="comfortable"
            :rules="setRuleType(notify.type)" />
          <v-icon style="font-size: 30px; margin: 10px 0px 0px 15px;" icon="mdi-trash-can"
            @click="removeTargetIdx(notify.type, index)" />
        </div>
      </div>
      <v-btn style="width: 1%; margin: 0px 0px 20px 30px;" variant="outlined" @click="addTarget(notify.type)">
        <v-icon>mdi-plus</v-icon>
      </v-btn>

      <v-card-actions>
        <div style="width: 100%; display: flex; margin: 10px 0px 20px;">
          <v-btn class="actions-btn" style="font-size: 18px;" variant="text" @click="closeNotifyDialog()">取消</v-btn>
          <v-spacer></v-spacer>
          <v-btn class="actions-btn" style="margin-right: 15%; font-size: 18px;" variant="text"
            @click="notify['state'] == 'ADD' ? addNotify() : editNotify()">設定完成</v-btn>
          <v-spacer></v-spacer>
        </div>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { useSetup } from '@/store/module/setup';

export default {
  data() {
    return {
      Setup: useSetup().$state,
      tableSearch: null,
      notify_header: [
        { title: "群組名稱", key: "name", align: "center" },
        { title: "Email", key: "mail.target", align: "center", width: "20%" },
        { title: "SMS", key: "sms.target", align: "center" },
        { title: "Teams", key: "teams.target", align: "center", width: "20%" },
        { title: "Line", key: "line.target", align: "center" },
        { title: "", key: "actions", align: "center", sortable: false, width: "10px" },
      ],
      notify_list: [
        {
          "uuid": "1aaa-acacacac-qdb3-234345",
          "name": "百達環控",
          "mail": {
            "enable": true,
            "target": ["A@gmail.com", "B@gmail.com", "C@gmail.com", "D@gmail.com"]
          },
          "sms": {
            "enable": true,
            "target": []
          },
          "teams": {
            "enable": true,
            "target": ["https://nantai.webhook.office.com/webhookb2/3cb667da-0056-4d9d-8055-7c932f80a7cb@14c1d832-7ea1-41d2-a95c-ad390cd04494/IncomingWebhook/fc35b589d06042f9b2f4bc754d2ca0e8/5a7212a1-dba0-4bd2-bb52-2315ede7cfd1/V21-zmU-FsnmEmduL7NNNQlT0nrqhdxW7wnObTYzcL1AU1"]
          },
          "line": {
            "enable": true,
            "target": ["@520fejxt"]
          }
        },
        {
          "uuid": "1aaa-acacacac-qdb3-234345",
          "name": "百達環控123",
          "mail": {
            "enable": false,
            "target": ["A@gmail.com", "B@gmail.com", "C@gmail.com", "D@gmail.com"]
          },
          "sms": {
            "enable": false,
            "target": []
          },
          "teams": {
            "enable": false,
            "target": ["https://nantai.webhook.office.com/webhookb2/asda-0056-4d9d-8055-7c932f80a7cb@14c1d832-7ea1-41d2-a95c-ad390cd04494/IncomingWebhook/fc35b589d06042f9b2f4bc754d2ca0e8/5a7212a1-dba0-4bd2-bb52-2315ede7cfd1/V21-zmU-FsnmEmduL7NNNQlT0nrqhdxW7wnObTYzcL1AU1"]
          },
          "line": {
            "enable": false,
            "target": ["@444asdeet"]
          }
        }
      ],
      notify: {
        dialog: false,
        state: "ADD",
        type: "mail",
        item: {
          name: "",  // 群組名稱
          mail: { "enable": true, "target": [] },   // Email
          sms: { "enable": true, "target": [] },    // SMS 手機簡訊
          teams: { "enable": true, "target": [] },  // Microsoft Teams 使用者URL
          line: { "enable": true, "target": [] }    // LINE Notify Group ID（也可為陣列）
        }
      }
    }
  },
  methods: {
    // 設定Target Array內的文字
    setTargetText(item) {
      const statusText = item.enable ? "啟用" : "禁用"; // 狀態文字
      const lines = [];
      for (let i = 0; i < item.target.length; i += 2) lines.push(item.target.slice(i, i + 2).join(", ")); // 每 2 個分組
      const result = `狀態: ${statusText}<br>${lines.join("\n")}`;
      return result
    },
    // 統一欄位顯示邏輯 (可擴充自訂文字)
    formatValue(key, val) {
      if (['mail', 'sms', 'teams', 'line'].includes(key)) return this.setTargetText(val);
      return String(val ?? '');
    },
    // 自訂搜尋模式
    customSearch(value, query, item) {
      if (query == null || query.trim() === '') return true;
      const normalizedQuery = query.toLowerCase();
      const { uuid, ...searchableData } = item.raw;
      const simpleValues = Object.entries(searchableData).map(([key, val]) => this.formatValue(key, val)).join(' ');
      return simpleValues.toLowerCase().includes(normalizedQuery);
    },
    openNotifyConfig(state, item) {
      this.notify['dialog'] = true;
      this.notify['state'] = state;
      if (state == 'EDIT') {
        this.notify['item'] = JSON.parse(JSON.stringify(item))
      }
    },
    addTarget(type) {
      this.notify['item'][type]['target'].push("")
    },
    removeTargetIdx(type, index) {
      this.notify['item'][type]['target'].splice(index, 1)
    },
    setLableType(type) {
      if (type == 'mail') return 'Email'
      else if (type == 'sms') return 'SMS 簡訊'
      else if (type == 'teams') return 'Teams Webhook URL'
      else if (type == 'line') return 'Line群組ID'
    },
    setRuleType(type) {
      if (type == 'mail') return [this.$utils.validType().required, this.$utils.validType().email]
      else return [this.$utils.validType().required]
    },

    addNotify() {
      var add = {
        uuid: crypto.randomUUID(),
        ...this.notify['item']
      }
      this.notify_list.push(add);
      this.closeNotifyDialog();
    },
    editNotify() {
      for (let i in this.notify_list) {
        if (this.notify_list[i]['uuid'] == this.notify['item']['uuid']) {
          this.notify_list[i] = this.notify['item']
          this.closeNotifyDialog();
        }
      }
    },
    removeNotify(item) {
      for (let i in this.notify_list) {
        if (this.notify_list[i]["uuid"] == item["uuid"]) {
          this.notify_list.splice(i, 1)
          console.log("Remove Notify: ", this.notify_list)
        }
      }
    },
    closeNotifyDialog() {
      this.notify['dialog'] = false;
      setTimeout(() => {
        this.notify['state'] = "ADD";
        this.notify['type'] = "mail",
          this.notify['item'] = {
            name: "",
            mail: { "enable": true, "target": [] },
            sms: { "enable": true, "target": [] },
            teams: { "enable": true, "target": [] },
            line: { "enable": true, "target": [] }
          }
      }, 50);
    }
  }
}
</script>


<style lang="scss" scoped>
.organize_table_class {
  height: 80vh;
}

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

:deep(.edit_datapoint .v-field__input) {
  padding: 0px !important;
  justify-content: center !important;
  text-align: center !important;
}

:deep(.edit_datapoint .v-field__append-inner) {
  padding-top: 12px !important;
}
</style>