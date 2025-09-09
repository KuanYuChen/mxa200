<!-- =================================================== 通知Dialog =================================================== -->
<template>
  <v-dialog v-model="alertDialog" :width="alertWidth" :retain-focus="false">
    <v-card>
      <v-card-title>
        <v-container class="modal-alert">
          <v-row v-if="alertIcon == 'success'">
            <v-col>
              <svg
                class="animation"
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 130.2 130.2"
              >
                <circle
                  class="path circle"
                  fill="none"
                  stroke="#73AF55"
                  stroke-width="6"
                  stroke-miterlimit="10"
                  cx="65.1"
                  cy="65.1"
                  r="62.1"
                />
                <polyline
                  class="path check"
                  fill="none"
                  stroke="#73AF55"
                  stroke-width="6"
                  stroke-linecap="round"
                  stroke-miterlimit="10"
                  points="100.2,40.2 51.5,88.8 29.8,67.5 "
                />
              </svg>
            </v-col>
          </v-row>
          <v-row v-else-if="alertIcon == 'error'">
            <v-col>
              <svg
                class="animation"
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 130.2 130.2"
              >
                <circle
                  class="path circle"
                  fill="none"
                  stroke="#D06079"
                  stroke-width="6"
                  stroke-miterlimit="10"
                  cx="65.1"
                  cy="65.1"
                  r="62.1"
                />
                <line
                  class="path line"
                  fill="none"
                  stroke="#D06079"
                  stroke-width="6"
                  stroke-linecap="round"
                  stroke-miterlimit="10"
                  x1="34.4"
                  y1="37.9"
                  x2="95.8"
                  y2="92.3"
                />
                <line
                  class="path line"
                  fill="none"
                  stroke="#D06079"
                  stroke-width="6"
                  stroke-linecap="round"
                  stroke-miterlimit="10"
                  x1="95.8"
                  y1="38"
                  x2="34.4"
                  y2="92.2"
                />
              </svg>
            </v-col>
          </v-row>
          <v-row v-else-if="alertIcon == 'warn'">
            <v-col>
              <div class="modal-icon modal-warning scaleWarning">
                <span class="modal-body pulseWarningIns"></span>
                <span class="modal-dot pulseWarningIns"></span>
              </div>
            </v-col>
          </v-row>
          <v-row align="center">
            <h3 class="title-style" v-html="alertTitle"></h3>
          </v-row>
        </v-container>
      </v-card-title>
      <v-card-actions>
        <v-container>
          <v-row>
            <v-spacer></v-spacer>
            <slot></slot>
            <v-spacer></v-spacer>
          </v-row>
          <div style="height: 50px"></div>
          <v-row>
            <v-spacer></v-spacer>
            <v-btn
              large
              variant="outlined"
              class="text-blue"
              @click="showStateDialogClose()"
            >
              OK
            </v-btn>
            <v-spacer></v-spacer>
          </v-row>
        </v-container>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { useSetup } from '@/store/module/setup.js'
import { mapWritableState } from 'pinia'

export default {
  data() {
    return {};
  },
  computed: {
    ...mapWritableState(useSetup, ["alertDialog","alertIcon","alertTitle","alertWidth"]),
  },
  watch: {
    alertDialog(isOpen) {
      isOpen || this.showStateDialogClose();
    },
  },
  methods: {
    showStateDialogClose() {
      var state = useSetup().$state
      state.alertDialog = false;
      setTimeout(() => {
        state.alertIcon = "";
        state.alertTitle = "";
        state.alertWidth = "500";
      }, 200);
    },
  },
};
</script>

<style lang="scss">
// =========================Title Style=========================
.title-style {
  margin: auto;
  font-size: 30px;
  text-align: center;
  font-family: serif;
  word-break: break-word;
  animation: text-focus-in 0.3s cubic-bezier(0.55, 0.085, 0.68, 0.53) both;
  color: black;
}
@keyframes text-focus-in {
  0% {
    filter: blur(12px);
    opacity: 0;
  }
  100% {
    filter: blur(0px);
    opacity: 1;
  }
}

// =========================Icon Animation=========================
// success、warn icon
.animation {
  width: 100px;
  display: block;
  margin: 40px auto 0;
}

.path {
  stroke-dasharray: 1000;
  stroke-dashoffset: 0;
  &.circle {
    -webkit-animation: dash 0.9s ease-in-out;
    animation: dash 0.9s ease-in-out;
  }
  &.line {
    stroke-dashoffset: 1000;
    -webkit-animation: dash 0.9s 0.35s ease-in-out forwards;
    animation: dash 0.9s 0.35s ease-in-out forwards;
  }
  &.check {
    stroke-dashoffset: -100;
    -webkit-animation: dash-check 0.9s 0.35s ease-in-out forwards;
    animation: dash-check 0.9s 0.35s ease-in-out forwards;
  }
}

@-webkit-keyframes dash {
  0% {
    stroke-dashoffset: 1000;
  }
  100% {
    stroke-dashoffset: 0;
  }
}

@keyframes dash {
  0% {
    stroke-dashoffset: 1000;
  }
  100% {
    stroke-dashoffset: 0;
  }
}

@-webkit-keyframes dash-check {
  0% {
    stroke-dashoffset: -100;
  }
  100% {
    stroke-dashoffset: 900;
  }
}

@keyframes dash-check {
  0% {
    stroke-dashoffset: -100;
  }
  100% {
    stroke-dashoffset: 900;
  }
}
// Warning icon
.modal-alert .modal-icon {
  border-radius: 50%;
  border: 4px solid gray;
  box-sizing: content-box;
  height: 80px;
  margin: 20px auto;
  padding: 0;
  position: relative;
  width: 80px;

  &.modal-warning {
    border-color: #f8bb86;

    &:before {
      animation: pulseWarning 2s linear infinite;
      background-color: #fff;
      border-radius: 50%;
      content: "";
      display: inline-block;
      height: 100%;
      opacity: 0;
      position: absolute;
      width: 100%;
    }

    &:after {
      background-color: #fff;
      border-radius: 50%;
      content: "";
      display: block;
      height: 100%;
      position: absolute;
      width: 100%;
      z-index: 1;
    }
  }

  &.modal-warning .modal-body {
    background-color: #f8bb86;
    border-radius: 2px;
    height: 47px;
    left: 50%;
    margin-left: -2px;
    position: absolute;
    top: 10px;
    width: 5px;
    z-index: 2;
  }

  &.modal-warning .modal-dot {
    background-color: #f8bb86;
    border-radius: 50%;
    bottom: 10px;
    height: 7px;
    left: 50%;
    margin-left: -3px;
    position: absolute;
    width: 7px;
    z-index: 2;
  }

  + .modal-icon {
    margin-top: 50px;
  }
}

.scaleWarning {
  animation: scaleWarning 0.75s infinite alternate;
}

.pulseWarningIns {
  animation: pulseWarningIns 0.75s infinite alternate;
}

@keyframes scaleWarning {
  0% {
    transform: scale(1);
  }

  30% {
    transform: scale(1.02);
  }

  100% {
    transform: scale(1);
  }
}

@keyframes pulseWarning {
  0% {
    background-color: #fff;
    transform: scale(1);
    opacity: 0.5;
  }

  30% {
    background-color: #fff;
    transform: scale(1);
    opacity: 0.5;
  }

  100% {
    background-color: #f8bb86;
    transform: scale(2);
    opacity: 0;
  }
}

@keyframes pulseWarningIns {
  0% {
    background-color: #f8d486;
  }

  100% {
    background-color: #f8bb86;
  }
}
</style>
