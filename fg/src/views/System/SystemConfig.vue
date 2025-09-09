<template>
  <v-main>
    <v-card style="margin: 15px;">
      <v-card-title style="display: flex;">
        <h4>最後修改時間: <br>{{ lastmodified }}</h4>
        <v-spacer></v-spacer>
      </v-card-title>
      <div style="margin: 10px 20px 10px;">
        <v-text-field v-model="sysname" label="系統名稱" variant="outlined" />
        <div style="display: flex; gap: 20px;">
          <v-text-field v-model="smtp" label="SMTP URL" variant="outlined" />
          <v-text-field v-model="port" label="SMTP Port" variant="outlined" type="number" hide-spin-buttons @keydown="$utils.blockInvalidKeys($event)" />
          <v-text-field v-model="user" label="SMTP User" variant="outlined" />
          <v-text-field v-model="password" label="SMTP Password" variant="outlined" />
        </div>
        <v-text-field v-model="passwordLockout" label="密碼最大錯誤次數" variant="outlined" type="number" min="0" @keydown="$utils.blockInvalidKeys($event)" />
      </div>
      <div style="display: flex; margin: 10px 0px;">
        <v-spacer></v-spacer>
        <v-btn class="actions-btn" style="background-color: #9393cd; color: white;">
          <h3>保存設定</h3>
        </v-btn>
        <v-spacer></v-spacer>
      </div>
    </v-card>
  </v-main>
</template>

<script>
export default {
  data() {
    return {
      lastmodified: "2023-10-01 12:00:00", // 最後修改時間
      sysname: "金慶科技機房環控系統", // 系統名稱
      // smtp送信參數
      smtp: "smtp.example.com",
      port: "587",
      user: "jtm",
      password: "yourpassword",
      passwordLockout: 3 // 密碼最大錯誤次數
    }
  }
}
</script>