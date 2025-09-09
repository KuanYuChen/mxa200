<!-- 日期選擇器
  範例用法
  <DatePickerInput
    v-model="eDate"
    label="活動日期 (E)"
    color="black"
    :rules="[requiredRule]"
    variant="outlined"
    :min="sDate"
    :max="new Date()"
    :withTime="true"
    :withSeconds="true"
  /> 
-->

<template>
  <v-menu v-model="menu" :close-on-content-click="false" location="bottom" >
    <!-- 觸發器 -->
    <template v-slot:activator="{ props }">
      <v-text-field
        :model-value="formattedDateTime"
        :label="label"
        append-inner-icon="mdi-calendar-clock"
        readonly hide-details
        v-bind="{ ...props, ...$attrs }"
      />
    </template>

    <!-- 內容 -->
    <v-card style="width: 100%;">
      <!-- 如果需要時間選擇，就顯示 Tabs -->
      <v-tabs v-if="withTime" v-model="tab" color="primary" grow>
        <v-tab value="date">日期</v-tab>
        <v-tab value="time">時間</v-tab>
      </v-tabs>

      <!-- 放置容器 -->
      <v-window v-model="tab">
        <!-- 日期選擇 -->
        <v-window-item value="date">
          <v-date-picker
            v-model="internalDate"
            :min="min" :max="max" hide-header
            :allowed-dates="allowedDates"
            @update:model-value="handleDateUpdate"
          />
        </v-window-item>

        
        <v-window-item value="time">
          <!-- 時間選擇 (只有在 withTime 為 true 時才會實際渲染內容) -->
          <v-time-picker v-if="withTime" 
            v-model="internalTime" 
            :allowed-hours="allowedHours" 
            :allowed-minutes="allowedMinutes" 
            format="24hr" scrollable
          />
          <!-- 秒數選擇 (只有在 withSeconds 為 true 時才會實際渲染內容) -->
          <v-slider v-if="withSeconds"
            style="margin: 10px 30px 10px;"
            v-model="internalSeconds"
            :label="`秒: ${internalSeconds}`"
            min="0" max="59" step="1" thumb-label
          />
        </v-window-item>
      </v-window>

      <v-divider></v-divider>

      <!-- 操作按鈕 -->
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn text color="grey" @click="cancel">取消</v-btn>
        <v-btn color="primary" @click="confirm">確定</v-btn>
      </v-card-actions>
    </v-card>
  </v-menu>
</template>

<script>
export default {
  inheritAttrs: false,
  props: {
    modelValue: { type: [Date, String, Number], default: null },
    label: { type: String, default: '選擇日期' },          // 日期文字
    min: { type: [Date, String, Number], default: null }, // 日期最小值
    max: { type: [Date, String, Number], default: null }, // 日期最大值

    withTime: { type: Boolean, default: false },          // 是否啟用時間 (時/分)
    withSeconds: { type: Boolean, default: false },       // 是否啟用時間 (秒)
    
    allowedDates: { type: Function, default: null },      // 允許日期
    allowedHours: { type: Function, default: null },      // 允許時間 (時)
    allowedMinutes: { type: Function, default: null },    // 允許時間 (分)
  },
  emits: ['update:modelValue'], // 更新v-model參數用
  data() {
    return {
      menu: false,
      tab: 'date', // 'date' 或 'time'
      internalDate: null, // 內部狀態，用於在使用者點擊 "確定" 前暫存日期時間
    };
  },
  computed: {
    // 格式化顯示在 v-text-field 的值
    formattedDateTime() {
      if (!this.modelValue) return '';
      const date = new Date(this.modelValue);
      const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
      if (this.withTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
        options.hour12 = false;
        if (this.withSeconds) options.second = '2-digit'; // 加入秒的格式
      }
      return date.toLocaleString('zh-TW', options).replace(/\//g, '-');
    },
    // 給 v-time-picker 用的 v-model 代理
    internalTime: {
      get() {
        var getInternalDate = this.internalDate;
        if (!getInternalDate) return '00:00';
        const hours = getInternalDate.getHours().toString().padStart(2, '0');
        const minutes = getInternalDate.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
      },
      set(timeString) {
        var setInternalDate = this.internalDate;
        if (!setInternalDate || !timeString) return;
        const [hours, minutes] = timeString.split(':');
        setInternalDate.setHours(parseInt(hours, 10));
        setInternalDate.setMinutes(parseInt(minutes, 10));
      }
    },
    // 秒的 v-model 代理
    internalSeconds: {
      get() {
        // 從 internalDate 讀取秒數
        return this.internalDate ? this.internalDate.getSeconds() : 0;
      },
      set(seconds) {
        // 當 slider 變動時，更新 internalDate 的秒數
        if (this.internalDate) {
          // 建立一個新 Date 物件來觸發響應性
          const newDate = new Date(this.internalDate);
          newDate.setSeconds(seconds);
          this.internalDate = newDate;
        }
      }
    }
  },
  watch: {
    // 當選單打開時，初始化internalDate
    menu(isOpen) {
      if (isOpen) {
        // 如果有傳入值，就用傳入的值；否則用今天
        this.internalDate = this.modelValue ? new Date(this.modelValue) : new Date();
        this.tab = 'date'; // 每次打開都預設顯示日期選擇
      }
    },
  },
  methods: {
    handleDateUpdate() {
      // 如果需要選擇時間，則在選完日期後自動跳到時間選擇頁
      if (this.withTime) this.tab = 'time';
    },
    confirm() {
      this.$emit('update:modelValue', this.internalDate);
      this.menu = false;
    },
    cancel() {
      this.menu = false;
    },
  },
};
</script>


<style lang="scss" scoped>
:deep(.v-overlay__content) {
  min-width: 0px !important;
}
</style>