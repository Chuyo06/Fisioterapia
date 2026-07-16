<template>
  <div class="patients-view">
    <h2 class="title" style="margin-bottom: 1.5rem; text-align: left;">Directorio de Pacientes</h2>
    
    <!-- Buscador -->
    <div class="search-container">
      <div style="position: relative;">
        <Search class="search-icon" :size="18" />
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Buscar paciente por nombre o apellido..." 
          class="input-field search-input"
        >
      </div>
    </div>

    <!-- Resumen Plano -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; padding-bottom: 0.75rem; border-bottom: 1px solid hsl(var(--color-text)/0.06); font-weight: 600;">
      <span style="color: var(--color-text-muted);">Total Registrados</span>
      <span style="font-size: 1.2rem; font-weight: 700; color: hsl(var(--color-primary-dark));">{{ filteredPatients.length }} paciente(s)</span>
    </div>

    <!-- Lista de pacientes (Diseño Plano) -->
    <div class="flat-section" style="padding: 0 1.5rem;">
      <div v-if="filteredPatients.length === 0" style="text-align: center; padding: 3rem 1rem; color: var(--color-text-muted); font-style: italic;">
        No se encontraron pacientes que coincidan con "{{ searchQuery }}".
      </div>
      <div v-else class="flat-list">
        <div 
          v-for="patient in filteredPatients" 
          :key="patient.id" 
          class="flat-row" 
          @click="goToDetail(patient.id)"
          style="cursor: pointer; padding: 1.25rem 0;"
        >
          <!-- Info Izquierda -->
          <div style="display: flex; flex-direction: column; gap: 0.25rem;">
            <h3 style="font-size: 1.1rem; font-weight: 700; color: hsl(var(--color-text));">
              {{ patient.first_name }} {{ patient.last_name }}
            </h3>
            <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; font-size: 0.85rem; color: var(--color-text-muted); font-weight: 500;">
              <span v-if="patient.phone" style="display: flex; align-items: center; gap: 0.25rem;">
                <Phone :size="13" /> {{ patient.phone }}
              </span>
              <span v-else style="font-style: italic; opacity: 0.7;">Sin teléfono</span>
              
              <span style="display: flex; align-items: center; gap: 0.25rem;">
                <CalendarDays :size="13" /> {{ patient.appointments.length }} cita(s)
              </span>
            </div>
          </div>
          
          <!-- Badges y Flecha Derecha -->
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div v-if="patient.totalGenerated > 0" class="badge-count" style="background-color: hsl(var(--color-success)/0.1); color: hsl(var(--color-success)); border: 1px solid hsl(var(--color-success)/0.2);">
              ${{ patient.totalGenerated }}
            </div>
            <ChevronRight :size="18" style="color: var(--color-text-muted); opacity: 0.6;" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Phone, CalendarDays, Search, DollarSign, ChevronRight } from '@lucide/vue'
import { store } from '../store'
import { useRouter } from 'vue-router'

const router = useRouter()
const searchQuery = ref('')

function goToDetail(id) {
  router.push(`/patients/${id}`)
}

const patients = computed(() => {
  return store.patients.map(p => {
    const pAppts = store.appointments.filter(a => a.patient_id === p.id)
    const pPays = store.payments.filter(pay => pay.patient_id === p.id)
    const totalGenerated = pPays.reduce((sum, pay) => sum + Number(pay.amount), 0)

    return {
      ...p,
      appointments: pAppts,
      totalGenerated
    }
  })
})

const filteredPatients = computed(() => {
  if (!searchQuery.value) return patients.value
  const q = searchQuery.value.toLowerCase()
  return patients.value.filter(p => {
    const fullName = `${p.first_name} ${p.last_name}`.toLowerCase()
    return fullName.includes(q)
  })
})
</script>

<style scoped>
.patients-view {
  padding-bottom: 2rem;
}

.search-container {
  margin-bottom: 1.5rem;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: hsl(var(--color-text-muted));
  pointer-events: none;
}

.search-input {
  padding: 1rem 1rem 1rem 2.8rem !important;
  border: 2px solid transparent !important;
  border-radius: var(--border-radius-lg) !important;
  background-color: hsl(var(--color-surface)) !important;
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-fast);
}

.search-input:focus {
  border-color: hsl(var(--color-primary)) !important;
  box-shadow: 0 4px 16px hsl(var(--color-primary)/0.15) !important;
}

.badge-count {
  background-color: hsl(var(--color-primary)/0.1);
  color: hsl(var(--color-primary-dark));
  padding: 0.4rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  white-space: nowrap;
}
</style>
