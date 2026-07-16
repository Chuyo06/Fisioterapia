<script setup>
import { ref, watch, onMounted } from 'vue'
import { RouterView, RouterLink, useRoute } from 'vue-router'
import { CalendarDays, Users, CircleDollarSign, Download, Home, Menu, ChevronLeft, ChevronRight, X } from '@lucide/vue'
import { store } from './store'

const isSidebarCollapsed = ref(false)
const isMobileMenuOpen = ref(false)
const route = useRoute()

watch(() => route.path, () => {
  closeMobileMenu()
})

onMounted(() => {
  store.fetchAllData()
})
function toggleSidebar() {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}

function toggleMobileMenu() {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

function closeMobileMenu() {
  isMobileMenuOpen.value = false
  isSidebarCollapsed.value = true
}
</script>

<template>
  <div class="app-container">
    <!-- Mobile Header -->
    <header class="mobile-header">
      <button @click="toggleMobileMenu" class="icon-btn" style="padding: 0.5rem; margin-left: -0.5rem; background: none; border: none; display: flex; align-items: center; justify-content: center; color: hsl(var(--color-text)); cursor: pointer;">
        <Menu :size="24" />
      </button>
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <img src="/favicon.png" alt="Logo" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover;" onerror="this.src='/favicon.svg'" />
        <span style="font-weight: 700; font-size: 0.95rem; color: hsl(var(--color-primary-dark));">Ana Sánchez</span>
      </div>
      <div style="width: 24px;"></div>
    </header>

    <!-- Mobile Drawer Overlay -->
    <div class="mobile-overlay" :class="{ 'is-open': isMobileMenuOpen }" @click="closeMobileMenu"></div>

    <!-- Sidebar Navigation (Drawer on Mobile, Sidebar on Desktop/iPad) -->
    <aside class="sidebar" :class="{ 'is-collapsed': isSidebarCollapsed, 'is-mobile-open': isMobileMenuOpen }">
      <div class="sidebar-header">
        <img src="/favicon.png" alt="Logo" class="sidebar-logo" onerror="this.src='/favicon.svg'" />
        <div class="sidebar-title-wrapper">
          <h1 style="font-size: 0.95rem; font-weight: 700; color: hsl(var(--color-primary-dark)); margin: 0; line-height: 1.2;">Ana Sánchez</h1>
          <p style="font-size: 0.65rem; color: hsl(var(--color-primary)); margin: 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Fisioterapeuta</p>
        </div>
        <button @click="closeMobileMenu" class="icon-btn sidebar-close-btn" style="display: none; margin-left: auto; padding: 0.25rem; background: none; border: none; align-items: center; justify-content: center; color: hsl(var(--color-text)); cursor: pointer;">
          <X :size="20" />
        </button>
      </div>

      <ul class="sidebar-menu">
        <li @click="closeMobileMenu">
          <RouterLink to="/" class="sidebar-item">
            <Home :size="20" />
            <span class="sidebar-item-text">Inicio</span>
          </RouterLink>
        </li>
        <li @click="closeMobileMenu">
          <RouterLink to="/agenda" class="sidebar-item">
            <CalendarDays :size="20" />
            <span class="sidebar-item-text">Agenda</span>
          </RouterLink>
        </li>
        <li @click="closeMobileMenu">
          <RouterLink to="/patients" class="sidebar-item">
            <Users :size="20" />
            <span class="sidebar-item-text">Pacientes</span>
          </RouterLink>
        </li>
        <li @click="closeMobileMenu">
          <RouterLink to="/finances" class="sidebar-item">
            <CircleDollarSign :size="20" />
            <span class="sidebar-item-text">Finanzas</span>
          </RouterLink>
        </li>
      </ul>

      <div class="sidebar-footer">
        <button @click="toggleSidebar" class="sidebar-toggle-btn">
          <ChevronLeft v-if="!isSidebarCollapsed" :size="20" />
          <ChevronRight v-else :size="20" />
        </button>
      </div>
    </aside>

    <!-- Main Content Area -->
    <div class="main-layout">
      <!-- Desktop Header -->
      <header style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 2rem; background-color: hsl(var(--color-surface)); border-bottom: 1px solid hsl(var(--color-text)/0.05); position: sticky; top: 0; z-index: 50; height: 70px;" class="desktop-header-only">
        <h2 style="font-size: 1rem; font-weight: 700; color: hsl(var(--color-text-muted)); margin: 0;">Panel de Gestión</h2>
        
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
    </div>
  </div>
</template>

<style>
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Hide desktop header on mobile and show sidebar close button on mobile drawer */
@media (max-width: 768px) {
  .desktop-header-only {
    display: none !important;
  }
  .sidebar-close-btn {
    display: flex !important;
  }
}
</style>
