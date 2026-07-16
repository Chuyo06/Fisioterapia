<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Phone, ArrowLeft, Save, Edit, FileText, Check, Calendar, Activity, User, Plus, X } from '@lucide/vue'
import { store } from '../store'
import { supabase } from '../lib/supabaseClient'
import CustomSelect from '../components/CustomSelect.vue'

const route = useRoute()
const router = useRouter()
const patientId = route.params.id

const patient = computed(() => store.patients.find(p => p.id === patientId))

const groupedHistory = computed(() => {
  const notes = store.clinical_notes
    .filter(n => n.patient_id === patientId)
    .map(n => ({
      type: 'clinical',
      id: `note-${n.id}`,
      originalId: n.id,
      date: n.date,
      treatment_plan: n.treatment_plan,
      observations: n.observations,
      original: n
    }))

  const appts = store.appointments
    .filter(a => a.patient_id === patientId && a.notes)
    .map(a => ({
      type: 'appointment',
      id: `appt-${a.id}`,
      originalId: a.id,
      date: a.appointment_date,
      notes: a.notes,
      original: a
    }))

  const combined = [...notes, ...appts]
  
  const groups = {}
  for (const item of combined) {
    const d = new Date(item.date)
    const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    
    if (!groups[dateStr]) {
      groups[dateStr] = {
        dateStr: dateStr,
        date: item.date,
        clinicals: [],
        appointments: []
      }
    }
    
    if (item.type === 'clinical') {
      groups[dateStr].clinicals.push(item)
    } else {
      groups[dateStr].appointments.push(item)
    }
  }

  return Object.values(groups).sort((a, b) => new Date(b.date) - new Date(a.date))
})

// Modals State
const showEditProfile = ref(false)
const showNoteModal = ref(false)

const profileForm = ref({
  first_name: '',
  last_name: '',
  phone: '',
  age: '',
  gender: '',
  diagnosis: ''
})

const isSavingProfile = ref(false)

function openEditProfile() {
  if (patient.value) {
    profileForm.value = {
      first_name: patient.value.first_name || '',
      last_name: patient.value.last_name || '',
      phone: patient.value.phone || '',
      age: patient.value.age || '',
      gender: patient.value.gender || '',
      diagnosis: patient.value.diagnosis || ''
    }
  }
  showEditProfile.value = true
}

async function saveProfile() {
  isSavingProfile.value = true
  
  const { error } = await supabase
    .from('patients')
    .update({
      first_name: profileForm.value.first_name,
      last_name: profileForm.value.last_name,
      phone: profileForm.value.phone,
      age: profileForm.value.age ? parseInt(profileForm.value.age) : null,
      gender: profileForm.value.gender,
      diagnosis: profileForm.value.diagnosis
    })
    .eq('id', patientId)
    
  if (error) {
    alert('Error al guardar el perfil del paciente.')
  } else {
    const idx = store.patients.findIndex(p => p.id === patientId)
    if (idx !== -1) {
      store.patients[idx] = { ...store.patients[idx], ...profileForm.value }
    }
    showEditProfile.value = false
  }
  isSavingProfile.value = false
}

const noteForm = ref({
  id: null,
  date: '',
  treatment_plan: '',
  observations: ''
})

const isSavingNote = ref(false)

function openNoteModal(note = null) {
  if (note) {
    noteForm.value = {
      id: note.id,
      date: note.date.split('T')[0],
      treatment_plan: note.treatment_plan || '',
      observations: note.observations || ''
    }
  } else {
    noteForm.value = {
      id: null,
      date: new Date().toISOString().split('T')[0],
      treatment_plan: '',
      observations: ''
    }
  }
  showNoteModal.value = true
}

async function saveNote() {
  isSavingNote.value = true
  
  const noteDate = new Date(noteForm.value.date + 'T12:00:00').toISOString()
  
  if (noteForm.value.id) {
    // Editar existente
    const { error } = await supabase
      .from('clinical_notes')
      .update({
        date: noteDate,
        treatment_plan: noteForm.value.treatment_plan,
        observations: noteForm.value.observations
      })
      .eq('id', noteForm.value.id)
      
    if (error) alert('Error al actualizar la nota.')
    else {
      const idx = store.clinical_notes.findIndex(n => n.id === noteForm.value.id)
      if (idx !== -1) {
        store.clinical_notes[idx].date = noteDate
        store.clinical_notes[idx].treatment_plan = noteForm.value.treatment_plan
        store.clinical_notes[idx].observations = noteForm.value.observations
      }
      showNoteModal.value = false
    }
  } else {
    // Nueva nota
    const { data, error } = await supabase
      .from('clinical_notes')
      .insert([{
        patient_id: patientId,
        date: noteDate,
        treatment_plan: noteForm.value.treatment_plan,
        observations: noteForm.value.observations
      }])
      .select()
      
    if (error) alert('Error al crear la nota.')
    else {
      store.clinical_notes.push(data[0])
      showNoteModal.value = false
    }
  }
  isSavingNote.value = false
}

function goBack() {
  router.push('/patients')
}

function formatDate(isoString) {
  const d = new Date(isoString)
  return d.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
}

</script>

<template>
  <div v-if="!patient" style="text-align: center; padding: 3rem 0; color: var(--color-text-muted);">
    <p>Cargando información del paciente o no existe...</p>
    <button @click="goBack" class="btn-primary" style="margin-top: 1rem;">Volver al directorio</button>
  </div>
  
  <div v-else class="patient-detail-view">
    <!-- Cabecera -->
    <div class="detail-header" style="margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: flex-start;">
      <div>
        <button @click="goBack" class="icon-btn" style="padding: 0.5rem; margin-left: -0.5rem; background: none; border: none; cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem; color: hsl(var(--color-primary-dark)); font-weight: 600;">
          <ArrowLeft :size="20" /> Directorio
        </button>
        <h1 style="font-size: 1.8rem; font-weight: 800; color: hsl(var(--color-primary-dark)); margin-top: 0.5rem;">
          Expediente Clínico
        </h1>
      </div>
      <button @click="openNoteModal(null)" class="btn-primary" style="background-color: hsl(var(--color-primary-dark)); color: white;">
        <Plus :size="18" /> Nueva Sesión
      </button>
    </div>

    <!-- Ficha Médica -->
    <div class="flat-section" style="margin-bottom: 2rem; background: linear-gradient(135deg, hsl(var(--color-primary)/0.05), hsl(var(--color-primary)/0.15)); border: 1px solid hsl(var(--color-primary)/0.2);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <div class="flat-section-title" style="display: flex; align-items: center; gap: 0.5rem; color: hsl(var(--color-primary-dark)); margin-bottom: 0;">
          <User :size="20" /> Datos del Paciente
        </div>
        <button @click="openEditProfile" class="icon-btn" style="padding: 0.4rem; background: hsl(var(--color-surface)); border-radius: 8px; border: 1px solid hsl(var(--color-primary)/0.2); color: hsl(var(--color-primary)); cursor: pointer;">
          <Edit :size="16" /> Editar
        </button>
      </div>

      <div class="profile-grid">
        <div class="profile-item">
          <span class="label">Nombre Completo</span>
          <span class="value" style="font-weight: 700; font-size: 1.1rem;">{{ patient.first_name }} {{ patient.last_name }}</span>
        </div>
        <div class="profile-item">
          <span class="label">Celular</span>
          <span class="value" style="display: flex; align-items: center; gap: 0.3rem;">
            <Phone :size="14" style="color: var(--color-text-muted)" /> {{ patient.phone || 'No registrado' }}
          </span>
        </div>
        <div class="profile-item">
          <span class="label">Edad / Género</span>
          <span class="value">{{ patient.age ? patient.age + ' años' : '--' }} / {{ patient.gender || '--' }}</span>
        </div>
        <div class="profile-item" style="grid-column: 1 / -1; background: hsl(var(--color-surface)); padding: 1rem; border-radius: 8px; margin-top: 0.5rem;">
          <span class="label" style="display: flex; align-items: center; gap: 0.3rem; color: hsl(var(--color-primary-dark)); margin-bottom: 0.5rem;">
            <Activity :size="16" /> Diagnóstico Principal
          </span>
          <span class="value" style="font-size: 1rem; line-height: 1.5; font-weight: 600;">
            {{ patient.diagnosis || 'Sin diagnóstico registrado. Presiona editar para agregar.' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Notas de Evolución -->
    <div class="flat-section-title" style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.5rem;">
      <FileText :size="20" /> Notas de Evolución y Tratamiento
    </div>
    
    <div v-if="groupedHistory.length === 0" style="text-align: center; color: var(--color-text-muted); padding: 3rem 0; background: hsl(var(--color-bg)); border-radius: 12px; border: 1px dashed hsl(var(--color-text)/0.2);">
      <p style="margin-bottom: 1rem;">No hay notas clínicas registradas.</p>
      <button @click="openNoteModal(null)" class="btn-primary" style="margin: 0 auto;">
        <Plus :size="16" /> Registrar primera sesión
      </button>
    </div>
    
    <div v-else class="clinical-timeline">
      <div v-for="group in groupedHistory" :key="group.dateStr" class="timeline-node">
        <div class="timeline-indicator"></div>
        <div class="timeline-node-content">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid hsl(var(--color-text)/0.1); padding-bottom: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <Calendar :size="16" style="color: hsl(var(--color-primary))" />
              <span style="font-weight: 800; font-size: 1.1rem; color: hsl(var(--color-primary-dark));">
                {{ formatDate(group.date) }}
              </span>
            </div>
            <button v-if="group.clinicals.length > 0" @click="openNoteModal(group.clinicals[0].original)" class="icon-btn" style="background: none; border: none; color: var(--color-text-muted); cursor: pointer; padding: 0.3rem;">
              <Edit :size="16" />
            </button>
          </div>
          
          <template v-if="group.appointments.length > 0">
            <div v-for="appt in group.appointments" :key="appt.id" style="margin-bottom: 1.25rem;">
              <span style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--color-text-muted); margin-bottom: 0.3rem; display: flex; align-items: center; gap: 0.5rem;">
                Motivo de Consulta <span style="font-size: 0.65rem; background: hsl(var(--color-text-muted)/0.1); padding: 0.1rem 0.4rem; border-radius: 4px;">Agenda</span>
              </span>
              <div style="background-color: hsl(var(--color-bg)); padding: 0.8rem; border-radius: 8px; font-size: 0.95rem; line-height: 1.5; white-space: pre-wrap; border: 1px dashed hsl(var(--color-text)/0.2);">
                {{ appt.notes }}
              </div>
            </div>
          </template>

          <template v-if="group.clinicals.length > 0">
            <div v-for="clin in group.clinicals" :key="clin.id">
              <div style="margin-bottom: 1.25rem;">
                <span style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--color-text-muted); margin-bottom: 0.3rem; display: block;">Plan de Tratamiento</span>
                <div style="background-color: hsl(var(--color-bg)); padding: 0.8rem; border-radius: 8px; font-size: 0.95rem; line-height: 1.5; white-space: pre-wrap; border-left: 3px solid hsl(var(--color-primary));">
                  {{ clin.treatment_plan || 'Sin especificar' }}
                </div>
              </div>

              <div style="margin-bottom: 1.25rem;">
                <span style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--color-text-muted); margin-bottom: 0.3rem; display: block;">Observaciones / Nota Rápida</span>
                <div style="background-color: hsl(var(--color-bg)); padding: 0.8rem; border-radius: 8px; font-size: 0.95rem; line-height: 1.5; white-space: pre-wrap;">
                  {{ clin.observations || 'Sin observaciones' }}
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Modal Editar Perfil -->
    <div v-if="showEditProfile" class="modal-backdrop" @click="showEditProfile = false">
      <div class="modal-content" @click.stop style="max-width: 500px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <h3 style="font-weight: 700; color: hsl(var(--color-primary-dark)); margin: 0;">Editar Perfil Médico</h3>
          <button @click="showEditProfile = false" class="modal-close-btn" style="position: static;"><X :size="20" /></button>
        </div>

        <form @submit.prevent="saveProfile">
          <div style="display: flex; gap: 1rem;">
            <div class="input-group" style="flex: 1;">
              <label class="input-label">Nombre *</label>
              <input v-model="profileForm.first_name" type="text" class="input-field" required>
            </div>
            <div class="input-group" style="flex: 1;">
              <label class="input-label">Apellido *</label>
              <input v-model="profileForm.last_name" type="text" class="input-field" required>
            </div>
          </div>
          
          <div style="display: flex; gap: 1rem;">
            <div class="input-group" style="flex: 1;">
              <label class="input-label">Celular</label>
              <input v-model="profileForm.phone" type="tel" class="input-field">
            </div>
            <div class="input-group" style="flex: 1;">
              <label class="input-label">Edad</label>
              <input v-model="profileForm.age" type="number" class="input-field">
            </div>
          </div>

          <div class="input-group">
            <label class="input-label">Género</label>
            <CustomSelect 
              v-model="profileForm.gender" 
              :options="[
                {label: 'Femenino', value: 'Femenino'}, 
                {label: 'Masculino', value: 'Masculino'}, 
                {label: 'Otro', value: 'Otro'}
              ]"
              placeholder="Seleccionar..."
            />
          </div>

          <div class="input-group">
            <label class="input-label">Diagnóstico Principal</label>
            <textarea v-model="profileForm.diagnosis" class="input-field" rows="3" placeholder="Diagnóstico inicial del paciente..."></textarea>
          </div>

          <button type="submit" class="btn-primary" style="width: 100%; justify-content: center; margin-top: 1rem;" :disabled="isSavingProfile">
            {{ isSavingProfile ? 'Guardando...' : 'Guardar Perfil' }}
          </button>
        </form>
      </div>
    </div>

    <!-- Modal Nota Clínica -->
    <div v-if="showNoteModal" class="modal-backdrop" @click="showNoteModal = false">
      <div class="modal-content" @click.stop style="max-width: 600px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <h3 style="font-weight: 700; color: hsl(var(--color-primary-dark)); margin: 0;">{{ noteForm.id ? 'Editar Sesión' : 'Nueva Sesión' }}</h3>
          <button @click="showNoteModal = false" class="modal-close-btn" style="position: static;"><X :size="20" /></button>
        </div>

        <form @submit.prevent="saveNote">
          <div class="input-group">
            <label class="input-label">Fecha de la Sesión *</label>
            <input v-model="noteForm.date" type="date" class="input-field" required>
          </div>

          <div class="input-group">
            <label class="input-label">Plan de Tratamiento</label>
            <textarea v-model="noteForm.treatment_plan" class="input-field" rows="3" placeholder="Ej. Ultrasonido 15min, estiramientos, ejercicios de fuerza..."></textarea>
          </div>

          <div class="input-group">
            <label class="input-label">Observaciones / Nota Rápida</label>
            <textarea v-model="noteForm.observations" class="input-field" rows="4" placeholder="¿Cómo respondió al tratamiento? ¿Dolor?"></textarea>
          </div>

          <button type="submit" class="btn-primary" style="width: 100%; justify-content: center; margin-top: 1rem;" :disabled="isSavingNote">
            {{ isSavingNote ? 'Guardando...' : 'Guardar Sesión' }}
          </button>
        </form>
      </div>
    </div>

  </div>
</template>

<style scoped>
.patient-detail-view {
  padding-bottom: 2rem;
}

.profile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.profile-item {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.profile-item .label {
  font-size: 0.75rem;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--color-text-muted);
}

.profile-item .value {
  font-size: 0.95rem;
  color: hsl(var(--color-text));
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
  bottom: 0;
  left: 3px;
  width: 2px;
  background-color: hsl(var(--color-primary)/0.2);
}

.timeline-node {
  position: relative;
  margin-bottom: 2rem;
}

.timeline-indicator {
  position: absolute;
  left: -1.5rem;
  top: 0.2rem;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: hsl(var(--color-surface));
  border: 2px solid hsl(var(--color-primary));
  z-index: 2;
  transform: translateX(-1px);
}

.timeline-node-content {
  background-color: hsl(var(--color-surface));
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid hsl(var(--color-text)/0.1);
  box-shadow: 0 4px 15px hsl(0 0% 0% / 0.03);
}

.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
}

.modal-content {
  background-color: hsl(var(--color-surface));
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}
</style>
