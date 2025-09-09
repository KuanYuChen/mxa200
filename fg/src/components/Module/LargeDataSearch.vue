<!-- 大數據選單搜尋過濾組件 -->
<template>
  <v-menu v-model="menuOpen" :close-on-content-click="false">
    <template v-slot:activator="{ props }">
      <v-text-field v-bind="props"
        :model-value="selectedItemText"
        :label="label" :variant="variant" :density="density"
        readonly append-inner-icon="mdi-chevron-down"
      />
    </template>
    
    <v-card width="100%">
      <v-text-field
        class="pa-2"
        v-model="menuSearch"
        label="搜尋..." variant="outlined" density="compact"
        hide-details autofocus prepend-inner-icon="mdi-magnify"
        @click.stop
      />

      <v-progress-linear v-if="isLoading" indeterminate color="primary" />
      <v-divider v-else></v-divider>
      
      <v-virtual-scroll :items="display_list" :height="display_list.length === 0 ? '0' : '300'" item-height="48">
        <template v-slot:default="{ item }">
          <v-list-item @click="selectItem(item)" :key="item[itemValue]">
            <v-list-item-title>{{ item[itemTitle] }}</v-list-item-title>
          </v-list-item>
        </template>
      </v-virtual-scroll>

      <v-list-item v-if="!isLoading && display_list.length === 0">
        <v-list-item-title class="text-center" style="margin: 10px 0;">
          <span style="color: black;">No Data Avaliable</span>
        </v-list-item-title>
      </v-list-item>
    </v-card>
  </v-menu>
</template>

<script>
export default {
  // 為了讓 v-model 正常運作
  props: {
    // v-model 綁定的值
    modelValue: { type: [String, Number, Object, null], default: null },
    items: { type: Array, required: true, default: () => [] },  // 傳入的完整列表
    itemTitle: { type: String, default: 'title' },              // 用於顯示的屬性名稱
    itemValue: { type: String, default: 'value' },              // 用於作為值的屬性名稱
    returnObject: { type: Boolean, default: false },            // 控制回傳值的型別
    label: { type: String, default: '' },                       // 元件的標籤
    // 傳遞 Vuetify 的樣式 props
    variant: { type: String, default: 'outlined' },
    density: { type: String, default: 'compact' },
  },
  // 聲明要觸發的事件，用於 v-model
  emits: ['update:modelValue'],

  data() {
    return {
      menuSearch: '',       // 選單搜尋欄位
      menuOpen: false,      // 選單開啟狀態

      display_list: [],     // 選單資料
      isLoading: false,     // 選單讀取狀態
      debounceTimer: null,  // 讀取時間器
    };
  },
  
  computed: {
    // 用於在主輸入框中顯示已選中項目的文字
    selectedItemText() {
      if (this.modelValue === null || this.modelValue === undefined) return '';
      // 如果modelValue 本身就是物件
      if (this.returnObject && typeof this.modelValue === 'object') return this.modelValue[this.itemTitle];
      
      // 如果modelValue 是值，則在列表中尋找
      const selected = this.items.find(item => item[this.itemValue] === this.modelValue);
      return selected ? selected[this.itemTitle] : '';
    }
  },

  watch: {
    // 監聽搜尋輸入框
    menuSearch(newValue) {
      this.isLoading = true;
      clearTimeout(this.debounceTimer); // 清除上一個計時器

      this.debounceTimer = setTimeout(() => {
        if (!newValue) this.display_list = this.items; // 如果搜尋框為空，顯示完整列表
        else {
          const lowerCaseSearch = newValue.toLowerCase();
          // 在這裡執行過濾操作
          this.display_list = this.items.filter(item => 
            String(item[this.itemTitle]).toLowerCase().includes(lowerCaseSearch)
          );
        }
        this.isLoading = false;
      }, 500);
    },
    // 監聽傳入的列表資訊變化，確保資料同步
    items: {
      handler(newItems) {
        this.display_list = newItems;
      },
      immediate: true,
    },
    // 監聽選單開關狀態，用於清空搜尋詞和設定寬度
    menuOpen(isOpen) {
      if (isOpen) {
        // 1. 先立即渲染一小部分，讓選單無延遲彈出
        this.display_list = this.items.slice(0, 150);
        // 2. 在下一個 tick，非同步載入全部資料
        setTimeout(() => this.display_list = this.items, 700);
      } else {
        setTimeout(() => {
          this.menuSearch = '';
          this.display_list = [];
        }, 100);
      }
    }
  },
  methods: {
    // 選擇項目後，透過 emit 更新 v-model 的值並關閉選單
    selectItem(item) {
      const valueToEmit = this.returnObject ? item : item[this.itemValue];
      this.$emit('update:modelValue', valueToEmit);
      this.menuOpen = false;
    }
  }
};
</script>