<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Phone, Mail, Calendar, DollarSign, ArrowLeft, Save, Edit, FileText, Check, Clock, User } from '@lucide/vue'
import { store } from '../store'
import { supabase } from '../lib/supabaseClient'

const route = useRoute()
const router = useRouter()
const patientId = route.params.id

const patient = computed(() => store.patients.find(p => p.id === patientId))

// Antecedentes y notas médicas generales del paciente
const generalNotes = ref('')
const isSavingGeneral = ref(false)

// Cargar antecedentes iniciales
watch(patient, (newVal) => {
  if (newVal) {
    generalNotes.value = newVal.notes || ''
  }
}, { immediate: true })

// Citas del paciente (ordenadas por fecha descendente, más reciente primero)
const appointments = computed(() => {
  return store.appointments
    .filter(a => a.patient_id === patientId)
    .sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date))
})

// Pagos del paciente
const payments = computed(() => {
  return store.payments
    .filter(p => p.patient_id === patientId)
    .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))
})

// Control de edición inline para notas de evolución de las citas
const editingApptId = ref(null)
const editingNotes = ref('')
const isSavingSessionNotes = ref(false)

function startEditNotes(appt) {
  editingApptId.value = appt.id
  editingNotes.value = appt.notes || ''
}

function cancelEditNotes() {
  editingApptId.value = null
  editingNotes.value = ''
}

// Guardar notas generales (historial médico estático del paciente)
async function saveGeneralNotes() {
  if (!patient.value) return
  isSavingGeneral.value = true
  
  const { error } = await supabase
    .from('patients')
    .update({ notes: generalNotes.value })
    .eq('id', patientId)
    
  if (error) {
    console.error('Error saving general notes:', error)
    alert('Error al guardar antecedentes médicos.')
  } else {
    // Actualizar en el almacén reactivo (store)
    const idx = store.patients.findIndex(p => p.id === patientId)
    if (idx !== -1) {
      store.patients[idx].notes = generalNotes.value
    }
    alert('Antecedentes guardados con éxito.')
  }
  isSavingGeneral.value = false
}

// Guardar notas de evolución de una cita
async function saveSessionNotes(apptId) {
  isSavingSessionNotes.value = true
  
  const { error } = await supabase
    .from('appointments')
    .update({ notes: editingNotes.value })
    .eq('id', apptId)
    
  if (error) {
    console.error('Error saving session notes:', error)
    alert('Error al guardar notas de evolución.')
  } else {
    // Actualizar en el almacén reactivo (store)
    const idx = store.appointments.findIndex(a => a.id === apptId)
    if (idx !== -1) {
      store.appointments[idx].notes = editingNotes.value
    }
    editingApptId.value = null
    editingNotes.value = ''
    alert('Notas de evolución actualizadas.')
  }
  isSavingSessionNotes.value = false
}

function goBack() {
  router.push('/patients')
}

function formatDate(isoString) {
  const d = new Date(isoString)
  return d.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatTime(isoString) {
  const d = new Date(isoString)
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function translateStatus(status) {
  switch(status) {
    case 'scheduled': return 'Programada'
    case 'completed': return 'Pagada / Liquidada'
    case 'cancelled': return 'Cancelada'
    default: return status
  }
}

function translatePaymentMethod(method) {
  switch(method) {
    case 'cash': return 'Efectivo'
    case 'card': return 'Tarjeta'
    case 'transfer': return 'Transferencia'
    default: return 'Otro'
  }
}
</script>

<template>
  <div v-if="!patient" style="text-align: center; padding: 3rem 0; color: var(--color-text-muted);">
    <p>Cargando información del paciente o no existe...</p>
    <button @click="goBack" class="btn-primary" style="margin-top: 1rem;">Volver al directorio</button>
  </div>
  
  <div v-else class="patient-detail-view">
    <!-- Cabecera y Botón de Volver -->
    <div class="detail-header" style="margin-bottom: 2rem;">
      <button @click="goBack" class="icon-btn" style="padding: 0.5rem; margin-left: -0.5rem; background: none; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem; color: hsl(var(--color-primary-dark)); font-weight: 600;">
        <ArrowLeft :size="20" /> Directorio
      </button>
      <h1 style="font-size: 1.8rem; font-weight: 800; color: hsl(var(--color-primary-dark)); margin-top: 0.5rem;">
        {{ patient.first_name }} {{ patient.last_name }}
      </h1>
      
      <!-- Datos de contacto rápidos -->
      <div style="display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 0.5rem; font-size: 0.9rem; color: var(--color-text-muted); font-weight: 500;">
        <span v-if="patient.phone" style="display: flex; align-items: center; gap: 0.3rem;">
          <Phone :size="14" /> {{ patient.phone }}
        </span>
        <span v-if="patient.email" style="display: flex; align-items: center; gap: 0.3rem;">
          <Mail :size="14" /> {{ patient.email }}
        </span>
      </div>
    </div>

    <!-- Layout en 2 columnas en Desktop / 1 en Móvil (Diseño Plano) -->
    <div class="detail-layout">
      <!-- Columna Izquierda (Historial Médico Estático) -->
      <div class="detail-left-column">
        <div class="flat-section">
          <div class="flat-section-title" style="display: flex; align-items: center; gap: 0.5rem;">
            <User :size="18" /> Expediente / Antecedentes
          </div>
          <p style="font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 1rem; font-weight: 500;">
            Registra aquí alergias, operaciones pasadas, padecimientos crónicos u observaciones de antecedentes generales.
          </p>
          <textarea 
            v-model="generalNotes" 
            class="input-field" 
            rows="6" 
            placeholder="Escribe alergias, cirugías, diagnósticos generales..."
            style="border: 1px solid hsl(var(--color-text)/0.1); border-radius: 12px; padding: 0.75rem; background-color: hsl(var(--color-bg)); font-family: inherit; font-size: 0.95rem; resize: vertical; margin-bottom: 1rem; width: 100%;"
          ></textarea>
          <button 
            @click="saveGeneralNotes" 
            class="btn-primary" 
            style="width: 100%; justify-content: center; box-shadow: none;"
            :disabled="isSavingGeneral"
          >
            <Save :size="16" /> {{ isSavingGeneral ? 'Guardando...' : 'Guardar Antecedentes' }}
          </button>
        </div>

        <!-- Historial de Pagos -->
        <div class="flat-section">
          <div class="flat-section-title" style="display: flex; align-items: center; gap: 0.5rem;">
            <DollarSign :size="18" /> Historial de Pagos
          </div>
          <div v-if="payments.length === 0" style="text-align: center; color: var(--color-text-muted); font-style: italic; padding: 1.5rem 0; font-size: 0.9rem;">
            No se han registrado pagos para este paciente.
          </div>
          <div v-else class="flat-list">
            <div v-for="pay in payments" :key="pay.id" class="flat-row" style="padding: 0.75rem 0;">
              <div>
                <div style="font-weight: 700; color: hsl(var(--color-text));">${{ Number(pay.amount).toFixed(2) }} MXN</div>
                <div style="font-size: 0.75rem; color: var(--color-text-muted); font-weight: 500; margin-top: 0.15rem;">
                  {{ formatDate(pay.payment_date) }} • {{ translatePaymentMethod(pay.payment_method) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Columna Derecha (Historial de Evolución / Citas) -->
      <div class="detail-right-column" style="flex: 1;">
        <div class="flat-section">
          <div class="flat-section-title" style="display: flex; align-items: center; gap: 0.5rem;">
            <Calendar :size="18" /> Notas de Evolución por Sesión
          </div>
          
          <div v-if="appointments.length === 0" style="text-align: center; color: var(--color-text-muted); font-style: italic; padding: 3rem 0;">
            Este paciente aún no tiene citas registradas.
          </div>
          
          <div v-else class="clinical-timeline">
            <div v-for="appt in appointments" :key="appt.id" class="timeline-node">
              <!-- Punto minimalista de la línea de tiempo -->
              <div class="timeline-indicator" :class="appt.status"></div>
              
              <!-- Contenido de la cita -->
              <div class="timeline-node-content">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.75rem;">
                  <div>
                    <span style="font-weight: 800; font-size: 1.1rem; color: hsl(var(--color-text));">{{ formatDate(appt.appointment_date) }}</span>
                    <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--color-text-muted); font-size: 0.8rem; margin-top: 0.15rem; font-weight: 600;">
                      <Clock :size="13" /> {{ formatTime(appt.appointment_date) }} • <Clock :size="13" style="margin-left: 0.2rem;" /> {{ appt.duration_minutes }} min
                    </div>
                  </div>
                  
                  <span class="timeline-status-badge" :class="appt.status">
                    {{ translateStatus(appt.status) }}
                  </span>
                </div>

                <!-- Sección de Notas de Evolución -->
                <div style="background-color: hsl(var(--color-bg)); padding: 1rem; border-radius: 12px; border: 1px solid hsl(var(--color-text)/0.04);">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <span style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: hsl(var(--color-primary)); display: flex; align-items: center; gap: 0.25rem;">
                      <FileText :size="13" /> Notas Clínicas de la Sesión
                    </span>
                    <button 
                      v-if="editingApptId !== appt.id && appt.status !== 'cancelled'" 
                      @click="startEditNotes(appt)" 
                      class="icon-btn" 
                      style="padding: 0.2rem; background: none; border: none; color: hsl(var(--color-primary-dark)); cursor: pointer;"
                    >
                      <Edit :size="14" />
                    </button>
                  </div>

                  <!-- Visualización de nota -->
                  <div v-if="editingApptId !== appt.id">
                    <p v-if="appt.notes" style="font-size: 0.95rem; color: hsl(var(--color-text)); line-height: 1.5; white-space: pre-wrap;">
                      {{ appt.notes }}
                    </p>
                    <p v-else style="font-size: 0.9rem; color: var(--color-text-muted); font-style: italic;">
                      Sin notas registradas para esta sesión.
                    </p>
                  </div>

                  <!-- Formulario de edición inline de nota -->
                  <div v-else>
                    <textarea 
                      v-model="editingNotes" 
                      class="input-field" 
                      rows="4" 
                      placeholder="Escribe la evolución, síntomas, diagnóstico o tratamiento realizado..."
                      style="border: 1px solid hsl(var(--color-primary)/0.4); border-radius: 8px; padding: 0.5rem; background-color: white; font-family: inherit; font-size: 0.95rem; resize: vertical; margin-bottom: 0.5rem; width: 100%;"
                    ></textarea>
                    <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                      <button 
                        @click="cancelEditNotes" 
                        class="btn-primary" 
                        style="background-color: transparent; color: var(--color-text-muted); padding: 0.35rem 0.75rem; font-size: 0.8rem; box-shadow: none;"
                      >
                        Cancelar
                      </button>
                      <button 
                        @click="saveSessionNotes(appt.id)" 
                        class="btn-primary" 
                        style="padding: 0.35rem 0.75rem; font-size: 0.8rem; box-shadow: none;"
                        :disabled="isSavingSessionNotes"
                      >
                        <Check :size="14" /> Guardar
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.patient-detail-view {
  padding-bottom: 2rem;
}

.detail-layout {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

@media (min-width: 900px) {
  .detail-layout {
    flex-direction: row;
    align-items: flex-start;
  }
  .detail-left-column {
    flex: 0 0 380px;
    position: sticky;
    top: 5rem;
  }
}

/* Línea de tiempo minimalista */
.clinical-timeline {
  position: relative;
  padding-left: 1.5rem;
  margin-top: 1rem;
}

.clinical-timeline::before {
  content: '';
  position: absolute;
  top: 0.5rem;
  bottom: 0.5rem;
  left: 3px;
  width: 2px;
  background-color: hsl(var(--color-text)/0.06);
}

.timeline-node {
  position: relative;
  margin-bottom: 2rem;
}

.timeline-node:last-child {
  margin-bottom: 0;
}

.timeline-indicator {
  position: absolute;
  left: -1.5rem;
  top: 0.4rem;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background-color: hsl(var(--color-primary));
  border: 2px solid white;
  z-index: 2;
  transform: translateX(-1px);
}

.timeline-indicator.completed {
  background-color: hsl(var(--color-success));
}

.timeline-indicator.cancelled {
  background-color: hsl(var(--color-danger));
}

.timeline-status-badge {
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.25px;
}

.timeline-status-badge.scheduled {
  background-color: hsl(var(--color-primary)/0.1);
  color: hsl(var(--color-primary-dark));
}

.timeline-status-badge.completed {
  background-color: hsl(var(--color-success)/0.1);
  color: hsl(var(--color-success));
}

.timeline-status-badge.cancelled {
  background-color: hsl(var(--color-danger)/0.1);
  color: hsl(var(--color-danger));
}
</style>
