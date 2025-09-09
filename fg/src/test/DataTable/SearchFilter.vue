<!-- Data table 搜尋過濾測試 -->
<template>
  <v-main>
    <v-card>
      <v-card-title>
        <v-text-field v-model="search" append-inner-icon="mdi-magnify" label="搜尋 (可搜尋'啟用'或'停用')" single-line hide-details />
      </v-card-title>

      <v-data-table :headers="headers" :items="desserts" :search="search" :custom-filter="customSearch"
        item-value="name">
        <template v-slot:item.status="{ item }">
          <v-chip :color="getStatusColor(item.status)">
            {{ getStatusText(item.status) }}
          </v-chip>
        </template>
      </v-data-table>
    </v-card>
  </v-main>
</template>

<script>
export default {
  data() {
    return {
      search: '',
      headers: [
        { title: '甜點 (100g serving)', align: 'start', key: 'name' },
        { title: '卡路里', key: 'calories' },
        { title: '脂肪 (g)', key: 'fat' },
        { title: '碳水化合物 (g)', key: 'carbs' },
        { title: '蛋白質 (g)', key: 'protein' },
        { title: '狀態', key: 'status' },
      ],
      desserts: [
        { name: '冰淇淋三明治', calories: 237, fat: 9.0, carbs: 37, protein: 4.3, status: 1 },
        { name: '閃電泡芙', calories: 262, fat: 16.0, carbs: 23, protein: 6.0, status: 2 },
        { name: '杯子蛋糕', calories: 305, fat: 3.7, carbs: 67, protein: 4.3, status: 1 },
        { name: '薑餅', calories: 356, fat: 16.0, carbs: 49, protein: 3.9, status: 2 },
      ],
    };
  },
  methods: {
    getStatusText(status) {
      return status === 1 ? '啟用' : '停用';
    },

    getStatusColor(status) {
      return status === 1 ? 'green' : 'red';
    },

    // 這是關鍵！自訂的搜尋函式
    customSearch(value, query, item) {
      if (query == null || query.trim() === '') return true;
      const normalizedQuery = query.toLowerCase();
      const { uuid, ...searchableData } = item.raw; 

      // 將 item.raw 物件所有的 value 組成一個字串
      const simpleValues = this.$utils.recursionOBJToArray(searchableData).join(' ');

      // 再手動加上透過 slot 產生的特殊文字
      const slotValues = this.getStatusText(item.raw.status);

      const searchableText = (simpleValues + ' ' + slotValues).toLowerCase();
      return searchableText.includes(normalizedQuery);
    },
  },
};
</script>