<template>
	<span class="example">{{ msg }}</span>
</template>
<script>
export default {
	data () {
		return {
			msg: 'hello world!'
		}
	}
}
</script>
<style scoped>
.example {
	color: red;
}
</style>