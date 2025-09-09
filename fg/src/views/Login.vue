<!-- =================================================== 登入頁面 =================================================== -->
<template>
  <v-main class="login-info">
    <v-container :class="animation ? 'hide' : 'show'">
      <v-row>
        <v-spacer></v-spacer>
        <v-col cols="12" lg="8" xl="6">
          <v-card style="border-width: 2px; border-radius: 15px;">
            <v-card-title>
              <v-container class="pb-0 pl-6">
                <h2>Login Page</h2>
              </v-container>
            </v-card-title>
            <v-container class="pl-10 pr-10 pb-0">
              <v-text-field v-model="username" variant="outlined" label="Username" single-line @keyup.enter="Login()"></v-text-field>
              <v-text-field
                v-model="password"
                variant="outlined"
                label="Password" single-line
                :type="checkpwd ? 'text' : 'password'" 
                :append-inner-icon="checkpwd ? 'fa-regular fa-eye ' : 'fa-regular fa-eye-slash'" 
                @click:append-inner="checkpwd = !checkpwd"
                @keyup.enter="Login()"
              />
            </v-container>
            <v-card-actions>
              <v-container class="pt-0 pl-0 pr-0">
                <v-row>
                  <v-spacer></v-spacer>
                  <v-col cols="11">
                    <v-btn block class="login-btn" :loading="loginLoad" @click="Login()">
                      <h3 style="text-transform:capitalize">Login</h3>
                    </v-btn>
                  </v-col>
                  <v-spacer></v-spacer>
                </v-row>
              </v-container>
            </v-card-actions>
          </v-card>
        </v-col>
        <v-spacer></v-spacer>
      </v-row>
    </v-container>
  </v-main>
  <showAlertDialog />
</template>

<script>
import { useSetup } from '@/store/module/setup.js'
import showAlertDialog from '@/components/animation/showAlertDialog.vue';

export default {
  components: { showAlertDialog },
  data() {
    return {
      Setup: useSetup().$state,
      username: "",
      password: "",
      checkpwd: false,
      loginLoad: false,
      animation: false,
    };
  },
  computed: {
  },
  created() {
    this.clearEvent();
  },
  methods: {
    clearEvent() {
      // 清除所有event
      window.onmousemove = null;
      window.onresize = null;
      localStorage.removeItem("WebState")
      localStorage.removeItem("CountTime")
      localStorage.removeItem("User")
      for (let i in this.Setup.interval_list) {
        clearInterval(this.Setup[this.Setup.interval_list[i]])
        this.Setup[this.Setup.interval_list[i]] = null;
      }
    },
    Login() {
      var Query = {
        username: this.username,
        password: this.password,
      }
      this.loginLoad = true;
      setTimeout(() => {
        useSetup().login(Query).then(()=>{
          localStorage.User = "admin"
          localStorage.WebState = "Login";
          setTimeout(() => {
            this.loginLoad = false;
            this.animation = true;
            var viewHomepage = 1
            useSetup().getEmapHomepage().then((res)=>{
              var data = res["data"]["index"]
              viewHomepage = `/view/${data == 0 ? 1 : data}`
            })
            .catch(()=> viewHomepage = "/view/1")
            .finally(()=> this.$router.push("/")) // this.$router.push(viewHomepage)
          }, 250);
        }).catch(() => {
          this.loginLoad = false;
          localStorage.User = "admin"
          localStorage.WebState = "Login";
          this.$router.push("/")
        })
      }, 3000);
    }
  }
};
</script>

<style lang="scss" scoped>
// .login-info {
//   background-color: rgb(233, 233, 233);
//   display: flex;
//   justify-content: center; // 水平置中
//   align-content: center; // 垂直置中
//   flex-wrap: wrap;
//   animation: show_info 1s;
// }

// .login-btn {
//   background-color: rgb(216, 213, 213);
//   border-width: 1.5px;
//   border-radius: 10px;
// }

.login-info {
  background: linear-gradient(135deg, #0f172a, #1e293b);
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  animation: fadeIn 1s ease-in-out;
}

.v-card {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(15px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  border-radius: 20px;
}

.v-card-title h2 {
  color: #fff;
  text-shadow: 0 0 8px rgba(0, 255, 255, 0.8);
}

:deep(.v-text-field) {
  color: rgb(249, 249, 249);

}
.v-text-field {
  input {
    color: #fff;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    border: none;
  }
}

:deep(.v-text-field) ::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

:deep(.v-input__control):focus-within {
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.8);
}

// .v-text-field:focus-within {
//   box-shadow: 0 0 10px rgba(0, 255, 255, 0.8);
// }

.login-btn {
  background: linear-gradient(90deg, #0ff 0%, #00f 100%);
  color: #fff;
  font-size: 18px;
  border-radius: 10px;
  transition: all 0.3s;
}

.login-btn:hover {
  box-shadow: 0 0 15px rgba(0, 255, 255, 1);
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}


</style>