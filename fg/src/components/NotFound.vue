<template>
  <v-main>
    <div class="not-found">
      <h1>404</h1>
      <p>Oops! The page you are looking for doesn't exist.</p>
    </div>
  </v-main>
</template>

<script>
export default {
  name: 'NotFound'
}
</script>

<style lang="scss" scoped>
.not-found {
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  background-color: #f8f9fa;
  color: #333;
}

.not-found h1 {
  font-size: 6rem;
  margin: 0;
  color: #ff6b6b;
}

.not-found p {
  font-size: 1.2rem;
  margin: 0.5rem 0 1.5rem;
}

.home-link {
  text-decoration: none;
  background-color: #42b983;
  color: white;
  padding: 0.6rem 1.2rem;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.home-link:hover {
  background-color: #369d78;
}
</style>
