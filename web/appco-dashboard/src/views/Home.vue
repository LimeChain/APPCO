<template>
  <div class="home">
    <img alt="Vue logo" src="../assets/logo.png" />
    <HelloWorld msg="Welcome to Your Vue.js + TypeScript App" />
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import Simulator from "@/components/Simulator.vue"; // @ is an alias to /src

export default Vue.extend({
  name: "home",
  components: {
    Simulator
  }
});
</script>
