<template>
  <div class="patients-view">
    <h2 class="title" style="margin-bottom: 1rem;">Directorio de Pacientes</h2>
    
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

    <!-- Total card -->
    <div style="background: linear-gradient(135deg, hsl(var(--color-primary)), hsl(var(--color-primary-dark))); border-radius: var(--border-radius-md); padding: 1.5rem; color: white; display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; box-shadow: var(--shadow-md);">
      <div>
        <div style="font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9; font-weight: 600;">Total Registrados</div>
        <div style="font-size: 2.5rem; font-weight: 700; line-height: 1;">{{ filteredPatients.length }}</div>
      </div>
      <Users :size="48" style="opacity: 0.2;" />
    </div>

    <!-- Lista de pacientes -->
    <div class="patients-list">
      <div v-for="patient in filteredPatients" :key="patient.id" class="card patient-card" @click="togglePatient(patient.id)" style="cursor: pointer; transition: all 0.2s;">
        
        <!-- Header: Info del paciente -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem;" :style="{ marginBottom: expandedPatientId === patient.id ? '1rem' : '0' }">
          <div>
            <h3 style="font-size: 1.2rem; font-weight: 700; color: hsl(var(--color-primary-dark)); margin-bottom: 0.25rem;">
              {{ patient.first_name }} {{ patient.last_name }}
            </h3>
            <div v-if="patient.phone" style="display: flex; align-items: center; gap: 0.4rem; color: var(--color-text-muted); font-size: 0.85rem; font-weight: 500;">
              <Phone :size="14" /> {{ patient.phone }}
            </div>
            <div v-else style="font-size: 0.8rem; color: var(--color-text-muted); opacity: 0.7; font-style: italic;">
              Sin teléfono
            </div>
          </div>
          
          <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; justify-content: flex-end;">
            <div v-if="patient.totalGenerated > 0" class="badge-count" style="background-color: hsl(var(--color-success)/0.1); color: hsl(var(--color-success)); border: 1px solid hsl(var(--color-success)/0.2);">
              <DollarSign :size="14" style="display: inline; vertical-align: text-bottom; margin-right: 0.1rem;" />
              {{ patient.totalGenerated }}
            </div>
            <div class="badge-count">
              <CalendarDays :size="14" style="display: inline; vertical-align: text-bottom; margin-right: 0.2rem;" />
              {{ patient.appointments.length }} citas
            </div>
            <div v-if="patient.appointments.filter(a => a.status === 'cancelled').length > 0" class="badge-count" style="background-color: hsl(var(--color-danger)/0.1); color: hsl(var(--color-danger)); border: 1px solid hsl(var(--color-danger)/0.2);">
              {{ patient.appointments.filter(a => a.status === 'cancelled').length }} Canceladas
            </div>
          </div>
        </div>

        <!-- Historial de Casos Clínicos -->
        <div class="accordion-wrapper" :class="{ 'is-expanded': expandedPatientId === patient.id }" @click.stop>
          <div class="accordion-inner">
            <div class="history-section">
              <h4 style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; color: hsl(var(--color-primary)); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.4rem;">
                <FileText :size="16" /> Expediente / Notas
              </h4>
              
              <div v-if="getNotes(patient).length === 0" style="font-size: 0.85rem; color: var(--color-text-muted); font-style: italic; background: hsl(var(--color-surface)); padding: 0.75rem; border-radius: 8px; border: 1px dashed hsl(var(--color-text)/0.1);">
                No hay notas clínicas registradas para este paciente en sus citas pasadas.
              </div>
              
              <div v-else class="notes-list">
                <div v-for="(note, idx) in getNotes(patient)" :key="idx" class="note-item">
                  <div class="note-date">{{ formatDate(note.date) }}</div>
                  <div class="note-content">{{ note.text }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div v-if="filteredPatients.length === 0" style="text-align: center; padding: 2rem; color: var(--color-text-muted); background: hsl(var(--color-text)/0.03); border-radius: var(--border-radius-md);">
        No se encontraron pacientes que coincidan con "{{ searchQuery }}".
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Users, Phone, CalendarDays, FileText, Search, DollarSign } from '@lucide/vue'
import { store } from '../store'

const searchQuery = ref('')
const expandedPatientId = ref(null)

function togglePatient(id) {
  if (expandedPatientId.value === id) {
    expandedPatientId.value = null
  } else {
    expandedPatientId.value = id
  }
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

// Extrae y ordena las notas de un paciente de sus citas
function getNotes(patient) {
  return patient.appointments
    .filter(a => a.notes && a.notes.trim() !== '')
    .map(a => ({
      date: a.appointment_date,
      text: a.notes
    }))
}

function formatDate(isoString) {
  const d = new Date(isoString)
  return d.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })
}
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
  padding: 1rem 1rem 1rem 2.8rem !important; /* Override underline style padding */
  border: 2px solid transparent !important; /* Override underline style border */
  border-radius: var(--border-radius-lg) !important;
  background-color: hsl(var(--color-surface)) !important;
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-fast);
}

.search-input:focus {
  border-color: hsl(var(--color-primary)) !important;
  box-shadow: 0 4px 16px hsl(var(--color-primary)/0.15) !important;
}

.patient-card {
  padding: 1.5rem;
  border-left: 4px solid hsl(var(--color-primary));
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

.history-section {
  background-color: hsl(var(--color-text)/0.03);
  padding: 1rem;
  border-radius: var(--border-radius-md);
  margin-top: 1.5rem;
  border: 1px solid hsl(var(--color-text)/0.05);
}

.notes-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 320px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

/* Custom Scrollbar for Notes List */
.notes-list::-webkit-scrollbar {
  width: 5px;
}
.notes-list::-webkit-scrollbar-track {
  background: transparent;
}
.notes-list::-webkit-scrollbar-thumb {
  background-color: hsl(var(--color-text) / 0.15);
  border-radius: 4px;
}
.notes-list::-webkit-scrollbar-thumb:hover {
  background-color: hsl(var(--color-text) / 0.3);
}

.note-item {
  background-color: hsl(var(--color-surface));
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid hsl(var(--color-text)/0.05);
  box-shadow: var(--shadow-sm);
}

.note-date {
  font-size: 0.7rem;
  font-weight: 700;
  color: hsl(var(--color-primary));
  text-transform: uppercase;
  margin-bottom: 0.5rem;
  border-bottom: 1px solid hsl(var(--color-text)/0.1);
  padding-bottom: 0.25rem;
  display: inline-block;
}

.note-content {
  font-size: 0.95rem;
  color: hsl(var(--color-text));
  line-height: 1.5;
  white-space: pre-wrap; /* Respeta los saltos de línea del textarea */
}

/* Animación del Acordeón */
.accordion-wrapper {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.accordion-wrapper.is-expanded {
  grid-template-rows: 1fr;
}

.accordion-inner {
  overflow: hidden;
}
</style>
