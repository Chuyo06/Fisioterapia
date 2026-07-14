<script setup>
import { ref, onMounted } from 'vue'
import { RouterView, RouterLink } from 'vue-router'
import { CalendarDays, Users, CircleDollarSign, Download } from '@lucide/vue'
import { store } from './store'

const deferredPrompt = ref(null)

onMounted(() => {
  store.fetchAllData()
  
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt.value = e
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt.value = null
  })
})

async function installApp() {
  if (!deferredPrompt.value) return
  deferredPrompt.value.prompt()
  const { outcome } = await deferredPrompt.value.userChoice
  if (outcome === 'accepted') {
    deferredPrompt.value = null
  }
}
</script>

<template>
  <div class="app-container">
    <header style="display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 1.5rem; background-color: hsl(var(--color-bg)); border-bottom: 1px solid hsl(var(--color-text)/0.05); position: sticky; top: 0; z-index: 50;">
      <img src="/favicon.png" alt="Logo" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;" onerror="this.src='/favicon.svg'" />
      <div style="display: flex; flex-direction: column;">
        <h1 style="font-size: 1rem; font-weight: 700; color: hsl(var(--color-primary-dark)); margin: 0; line-height: 1.2;">Ana Sánchez</h1>
        <p style="font-size: 0.7rem; color: hsl(var(--color-primary)); margin: 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Fisioterapeuta</p>
      </div>
      
      <button v-if="deferredPrompt" @click="installApp" class="btn-primary" style="margin-left: auto; padding: 0.4rem 0.8rem; font-size: 0.8rem; border-radius: 999px; display: flex; align-items: center; gap: 0.3rem; background-color: hsl(var(--color-primary)); box-shadow: var(--shadow-sm);">
        <Download :size="14" /> Instalar App
      </button>
    </header>

    <main class="page-content">
      <div v-if="!store.isLoaded" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 50vh; color: var(--color-primary);">
        <div style="width: 40px; height: 40px; border: 4px solid hsl(var(--color-primary)/0.2); border-top-color: hsl(var(--color-primary)); border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 1rem;"></div>
        <p style="font-weight: 600; font-size: 0.9rem;">Sincronizando base de datos...</p>
      </div>
      <RouterView v-else />
    </main>
    
    <nav class="bottom-nav">
      <RouterLink to="/" class="nav-item">
        <CalendarDays :size="24" />
        <span>Agenda</span>
      </RouterLink>

      <RouterLink to="/patients" class="nav-item">
        <Users :size="24" />
        <span>Pacientes</span>
      </RouterLink>
      
      <RouterLink to="/finances" class="nav-item">
        <CircleDollarSign :size="24" />
        <span>Finanzas</span>
      </RouterLink>
    </nav>
  </div>
</template>

<style>
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
