<!-- =================================================== 編輯頁面 - 背景設定Dialog =================================================== -->
<template>
  <v-dialog v-model="bg['dialog']" width="700" persistent>
    <v-card>
      <v-card-title>
        <h2 style="text-align: center;margin: 10px;font-size: 40px;">編輯背景資訊</h2>
      </v-card-title>
      <v-container>
        <v-radio-group style="margin: 0px 0px 10px 20px;" v-model="bgType" inline hide-details>
          <v-radio label="實心填滿" value="color"></v-radio>
          <v-radio label="圖片" value="image"></v-radio>
        </v-radio-group>
        <v-menu v-if="bgType == 'color'" :close-on-content-click="false" min-width="300px">
          <template #activator="{ props }">
            <v-text-field
              style="margin: 0px 30px;"
              v-model="bg['info']['background']"
              label="背景顏色"
              variant="outlined"
              v-bind="props"
            />
          </template>
          <v-color-picker v-model="bg['info']['background']" />
        </v-menu>
        <div v-if="bgType == 'image'" style="display: flex;">
          <div style="margin: 10px 15px 0px 30px;">
            <input type="file" accept=".jpg,.png,.svg" ref="fileInput" @change="editImage" style="display: none" />
            <v-btn color="primary" @click="triggerFileUpload"><h3>編輯底圖</h3></v-btn>
          </div>
          <v-select
            style="margin: 0px 30px;"
            v-model="bg['info']['imageopacity']"
            :items="opacity_list"
            label="透明度"
            variant="outlined"
          >
          </v-select>
        </div>
      </v-container>

      <v-card-actions>
        <div style="width: 100%;display: flex;margin: 20px 0px;">
          <v-spacer></v-spacer>
          <v-btn class="actions-btn" style="color: red;" variant="outlined" @click="closeBackground()">
            <h3>關閉</h3>
          </v-btn>
          <v-btn class="actions-btn" style="color: black;" variant="outlined" @click="editBackground()">
            <h3>確定</h3>
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
  props: ["bg"],
  data() {
    return {
      bgType: "color",
      opacity_list: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1], // 圖片透明度列表
    }
  },
  methods: {
    triggerFileUpload() {
      this.$refs.fileInput.click();
    },
    editImage(event) {
      this.$emit("editImage", event);
    },
    removeBg() {
      this.$emit("removeBg");
    },
    closeBackground() {
      this.$emit("closeBackground");
    },
    editBackground() {
      if (this.bgType == "color") {
        this.bg['info']['image'] = "";
        this.bg['info']['imageopacity'] = 1;
      } else {
        this.bg['info']['background'] = "#FFFFFF";
      }
      this.$emit("editBackground", this.bgType);
    }
  }
}
</script>
