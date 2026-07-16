<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { supabase } from '../lib/supabaseClient'
import { ChevronLeft, ChevronRight, Plus, Clock, Phone, FileText, Trash2, Edit2, X, Check, DollarSign } from '@lucide/vue'
import { store } from '../store'
import CustomSelect from '../components/CustomSelect.vue'

function getLocalDateString(date) {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatTime(isoString) {
  const d = new Date(isoString)
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function formatApptTimeRange(startIso, durationMinutes) {
  const start = new Date(startIso)
  const end = new Date(start.getTime() + durationMinutes * 60000)
  
  const formatTimePart = (d) => {
    let hours = d.getHours()
    const minutes = d.getMinutes().toString().padStart(2, '0')
    const ampm = hours >= 12 ? 'pm' : 'am'
    hours = hours % 12
    hours = hours ? hours : 12
    return `${hours}:${minutes}${ampm}`
  }
  
  return `${formatTimePart(start)} - ${formatTimePart(end)}`
}

function translatePaymentMethod(method) {
  switch(method) {
    case 'cash': return 'Efectivo'
    case 'card': return 'Tarjeta'
    case 'transfer': return 'Transferencia'
    default: return 'Otro'
  }
}

const appointments = computed(() => store.appointments)
const allPatients = computed(() => store.patients)

const toastMessage = ref('')
function showToast(msg) {
  toastMessage.value = msg
  setTimeout(() => { toastMessage.value = '' }, 4500)
}

// State: Date and Selection
const selectedDate = ref(new Date())
selectedDate.value.setHours(0,0,0,0)

// Week Navigation State
const currentWeekStart = ref(new Date())

function getMonday(d) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
  return new Date(date.setDate(diff))
}

onMounted(() => {
  currentWeekStart.value = getMonday(new Date())
})

// Generate week days (Monday to Sunday)
const weekDays = computed(() => {
  const days = []
  const start = new Date(currentWeekStart.value)
  for (let i = 0; i < 7; i++) {
    const day = new Date(start)
    day.setDate(start.getDate() + i)
    day.setHours(0,0,0,0)
    days.push(day)
  }
  return days
})

function prevWeek() {
  const d = new Date(currentWeekStart.value)
  d.setDate(d.getDate() - 7)
  currentWeekStart.value = d
}

function nextWeek() {
  const d = new Date(currentWeekStart.value)
  d.setDate(d.getDate() + 7)
  currentWeekStart.value = d
}

function selectCurrentWeek() {
  currentWeekStart.value = getMonday(new Date())
}

// Current week range text (e.g. "Julio 14 - Julio 20, 2026")
const weekRangeText = computed(() => {
  if (weekDays.value.length === 0) return ''
  const start = weekDays.value[0]
  const end = weekDays.value[6]
  
  const startMonth = start.toLocaleDateString('es-MX', { month: 'long' })
  const endMonth = end.toLocaleDateString('es-MX', { month: 'long' })
  
  if (startMonth === endMonth) {
    return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`
  } else {
    return `${start.toLocaleDateString('es-MX', { month: 'short' })} ${start.getDate()} - ${end.toLocaleDateString('es-MX', { month: 'short' })} ${end.getDate()}, ${start.getFullYear()}`
  }
})

// Active clock tracker for live timeline
const now = ref(new Date())
let nowInterval

onMounted(() => {
  nowInterval = setInterval(() => {
    now.value = new Date()
  }, 60000)
})

onUnmounted(() => {
  clearInterval(nowInterval)
})

function isToday(date) {
  return date.toDateString() === now.value.toDateString()
}

// Timeline configs
const timelineStartHour = 7  // 7 AM
const timelineEndHour = 20    // 8 PM
const timelineHours = Array.from({ length: timelineEndHour - timelineStartHour + 1 }, (_, i) => i + timelineStartHour)
const pixelsPerHour = 75

// Current Time Indicator top offset
const currentTimeLineStyle = computed(() => {
  const currentHour = now.value.getHours()
  const currentMin = now.value.getMinutes()
  
  if (currentHour < timelineStartHour || currentHour > timelineEndHour) return { display: 'none' }
  
  const minutesSinceStart = ((currentHour - timelineStartHour) * 60) + currentMin
  const topOffset = (minutesSinceStart / 60) * pixelsPerHour
  
  return {
    top: `${topOffset}px`,
    display: 'block'
  }
})

// Get appointments for a specific day
function getAppointmentsForDay(day) {
  const localDateStr = getLocalDateString(day)
  return appointments.value.filter(appt => {
    const apptDate = new Date(appt.appointment_date)
    return getLocalDateString(apptDate) === localDateStr
  })
}

// Calculate absolute position style for appointments in column
function calculateApptPositionStyle(appt) {
  const d = new Date(appt.appointment_date)
  const hour = d.getHours()
  const min = d.getMinutes()
  
  let totalMinutesFrom7AM = ((hour - timelineStartHour) * 60) + min
  if (totalMinutesFrom7AM < 0) totalMinutesFrom7AM = 0
  
  const topOffset = (totalMinutesFrom7AM / 60) * pixelsPerHour
  const heightPixels = (appt.duration_minutes / 60) * pixelsPerHour
  
  let bgColor = 'hsl(var(--color-primary) / 0.1)'
  let borderColor = 'hsl(var(--color-primary))'
  let textColor = 'hsl(var(--color-primary-dark))'
  
  if (appt.status === 'completed') {
    bgColor = 'hsl(var(--color-success) / 0.1)'
    borderColor = 'hsl(var(--color-success))'
    textColor = 'hsl(var(--color-success))'
  } else if (appt.status === 'cancelled') {
    bgColor = 'hsl(var(--color-danger) / 0.1)'
    borderColor = 'hsl(var(--color-danger))'
    textColor = 'hsl(var(--color-danger))'
  }
  
  return {
    top: `${topOffset}px`,
    height: `${heightPixels}px`,
    backgroundColor: bgColor,
    borderColor: borderColor,
    color: textColor
  }
}

// Modals State
const showForm = ref(false)
const selectedAppointment = ref(null)
const selectedAppointmentPayment = computed(() => {
  if (!selectedAppointment.value || selectedAppointment.value.status !== 'completed') return null
  return store.payments.find(p => p.appointment_id === selectedAppointment.value.id)
})
const isEditingAppointment = ref(false)
const showPaymentForm = ref(false)
const isCancelling = ref(false)

const form = ref({
  selectedPatientId: 'new',
  date: '',
  first_name: '',
  last_name: '',
  phone: '',
  start_time: '09:00',
  end_time: '10:00',
  notes: '',
  location: 'Consultorio'
})

const editAppointmentForm = ref({
  date: '',
  start_time: '',
  end_time: ''
})

const paymentForm = ref({
  amount: '',
  payment_method: 'cash'
})

// Time Options for selects (8am to 8pm, 30 min intervals)
const timeOptions = Array.from({ length: 25 }).map((_, i) => {
  const hour = Math.floor(i / 2) + 8
  const min = (i % 2) * 30
  const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
  
  const d = new Date()
  d.setHours(hour, min, 0)
  const label = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true })
  
  return { label, value: timeStr }
})

// Click empty grid space to create appointment prefilled with day & hour
function clickGrid(day, hour) {
  const clickedDate = new Date(day)
  clickedDate.setHours(hour, 0, 0, 0)
  selectedDate.value = clickedDate
  
  form.value = {
    selectedPatientId: 'new',
    date: getLocalDateString(clickedDate),
    first_name: '',
    last_name: '',
    phone: '',
    start_time: `${hour.toString().padStart(2, '0')}:00`,
    end_time: `${(hour + 1).toString().padStart(2, '0')}:00`,
    notes: ''
  }
  
  selectedAppointment.value = null
  showPaymentForm.value = false
  showForm.value = true
}

// Click add appointment button
function clickAddAppt() {
  selectedDate.value = new Date()
  form.value = {
    selectedPatientId: 'new',
    date: getLocalDateString(selectedDate.value),
    first_name: '',
    last_name: '',
    phone: '',
    start_time: '09:00',
    end_time: '10:00',
    notes: ''
  }
  selectedAppointment.value = null
  showPaymentForm.value = false
  showForm.value = true
}

function openAppointmentDetails(appt) {
  selectedAppointment.value = appt
  showForm.value = false
  isEditingAppointment.value = false
  showPaymentForm.value = false
  paymentForm.value = { amount: '', payment_method: 'cash' }
  
  const d = new Date(appt.appointment_date)
  const dateStr = getLocalDateString(d)
  const startStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  
  const dEnd = new Date(d.getTime() + (appt.duration_minutes * 60000))
  const endStr = dEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })

  editAppointmentForm.value = {
    date: dateStr,
    start_time: startStr,
    end_time: endStr
  }
}

function closeAllModals() {
  showForm.value = false
  selectedAppointment.value = null
  showPaymentForm.value = false
  isEditingAppointment.value = false
}

// Check overlaps
function hasOverlap(dateStr, startMins, endMins, excludeApptId = null) {
  return store.appointments.some(appt => {
    if (appt.status === 'cancelled') return false
    if (excludeApptId && appt.id === excludeApptId) return false
    
    const apptDate = new Date(appt.appointment_date)
    const apptDateStr = getLocalDateString(apptDate)
    
    if (apptDateStr !== dateStr) return false
    
    const apptStartMins = (apptDate.getHours() * 60) + apptDate.getMinutes()
    const apptEndMins = apptStartMins + appt.duration_minutes
    
    return startMins < apptEndMins && endMins > apptStartMins
  })
}

// Save Appointment
async function saveAppointment() {
  // Sincronizar autocompletados e inputs en iOS/Safari forzando blur del teclado virtual
  if (document.activeElement && typeof document.activeElement.blur === 'function') {
    document.activeElement.blur()
  }

  if (!form.value.start_time || !form.value.end_time) {
    alert("Completa la hora de inicio y de fin.")
    return
  }

  const [startH, startM] = form.value.start_time.split(':').map(Number)
  const [endH, endM] = form.value.end_time.split(':').map(Number)
  const duration = ((endH * 60) + endM) - ((startH * 60) + startM)

  if (duration <= 0) {
    alert('La hora de fin debe ser posterior a la de inicio.')
    return
  }

  const dateString = form.value.date
  const startTotalMins = (startH * 60) + startM
  const endTotalMins = (endH * 60) + endM

  if (hasOverlap(dateString, startTotalMins, endTotalMins)) {
    showToast("Ya tienes una cita a esta hora.")
    return
  }

  let patientId = form.value.selectedPatientId

  if (patientId === 'new') {
    if (!form.value.first_name || !form.value.last_name) {
      alert("Para un nuevo paciente, debes ingresar nombre y apellido.")
      return
    }
    
    const cleanPhone = form.value.phone ? form.value.phone.trim() : ''
    const patientPhone = cleanPhone !== '' ? cleanPhone : null

    const { data: newPatient, error: patError } = await supabase
      .from('patients')
      .insert([{
        first_name: form.value.first_name.trim(),
        last_name: form.value.last_name.trim(),
        phone: patientPhone
      }])
      .select()
      
    if (patError) {
      alert("Error al registrar el nuevo paciente: " + patError.message)
      return
    }
    patientId = newPatient[0].id
    store.patients.push(newPatient[0])
    store.patients.sort((a, b) => a.first_name.localeCompare(b.first_name))
  }

  const [y, m, d] = form.value.date.split('-').map(Number)
  const finalDate = new Date(y, m - 1, d, startH, startM, 0, 0)

  const { data: apptData, error: apptError } = await supabase
    .from('appointments')
    .insert([{
      patient_id: patientId,
      appointment_date: finalDate.toISOString(),
      duration_minutes: duration,
      location: form.value.location,
      notes: form.value.notes,
      status: 'scheduled'
    }])
    .select('*, patients(*)')

  if (apptError) {
    alert('Error al agendar la cita.')
  } else {
    store.appointments.push(apptData[0])
    showForm.value = false
    showToast("Cita agendada correctamente.")
  }
}

// Edit Appointment
async function updateAppointment() {
  const [startH, startM] = editAppointmentForm.value.start_time.split(':').map(Number)
  const [endH, endM] = editAppointmentForm.value.end_time.split(':').map(Number)
  const duration = ((endH * 60) + endM) - ((startH * 60) + startM)

  if (duration <= 0) {
    alert('La hora de fin debe ser posterior a la de inicio.')
    return
  }

  const dateString = editAppointmentForm.value.date
  const startTotalMins = (startH * 60) + startM
  const endTotalMins = (endH * 60) + endM

  if (hasOverlap(dateString, startTotalMins, endTotalMins, selectedAppointment.value.id)) {
    showToast("Ya tienes una cita a esta hora.")
    return
  }

  const datetimeString = `${editAppointmentForm.value.date}T${editAppointmentForm.value.start_time}:00`
  const newDate = new Date(datetimeString)

  const { data, error } = await supabase
    .from('appointments')
    .update({
      appointment_date: newDate.toISOString(),
      duration_minutes: duration
    })
    .eq('id', selectedAppointment.value.id)
    .select('*, patients(*)')

  if (error) {
    alert("Error al actualizar la cita.")
  } else {
    const idx = store.appointments.findIndex(a => a.id === selectedAppointment.value.id)
    if (idx !== -1) store.appointments[idx] = data[0]
    selectedAppointment.value = data[0]
    isEditingAppointment.value = false
    showToast("Horario actualizado.")
  }
}

// Liquidate Payment
async function submitPayment() {
  if (!paymentForm.value.amount) return

  const { error: payError } = await supabase.from('payments').insert({
    appointment_id: selectedAppointment.value.id,
    patient_id: selectedAppointment.value.patient_id,
    amount: parseFloat(paymentForm.value.amount),
    payment_method: paymentForm.value.payment_method
  })

  if (payError) {
    alert("Error al registrar el pago.")
    return
  }

  const { data, error: apptError } = await supabase
    .from('appointments')
    .update({ status: 'completed' })
    .eq('id', selectedAppointment.value.id)
    .select('*, patients(*)')

  if (!apptError && data) {
    const idx = store.appointments.findIndex(a => a.id === selectedAppointment.value.id)
    if (idx !== -1) store.appointments[idx] = data[0]
    selectedAppointment.value = data[0]
    showPaymentForm.value = false
    
    const { data: payRecord } = await supabase.from('payments').select('*, patients(first_name, last_name)').eq('appointment_id', selectedAppointment.value.id)
    if (payRecord && payRecord.length > 0) {
      store.payments.unshift(payRecord[0])
    }
    showToast("Cita pagada con éxito.")
  }
}

// Cancel Appointment
async function cancelAppointment() {
  isCancelling.value = true
  try {
    const { data, error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', selectedAppointment.value.id)
      .select('*, patients(*)')

    if (!error && data) {
      const idx = store.appointments.findIndex(a => a.id === selectedAppointment.value.id)
      if (idx !== -1) store.appointments[idx] = data[0]
      selectedAppointment.value = data[0]
      showToast("Cita cancelada.")
    }
  } finally {
    isCancelling.value = false
  }
}

// Delete Appointment
async function deleteAppointment() {
  if (!confirm('¿Estás seguro de que deseas eliminar esta cita permanentemente? Esta acción no se puede deshacer.')) return
  
  isCancelling.value = true
  try {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', selectedAppointment.value.id)

    if (!error) {
      const idx = store.appointments.findIndex(a => a.id === selectedAppointment.value.id)
      if (idx !== -1) store.appointments.splice(idx, 1)
      selectedAppointment.value = null
      showToast("Cita eliminada permanentemente.")
    } else {
      alert("Error al eliminar la cita: " + error.message)
    }
  } finally {
    isCancelling.value = false
  }
}

function getDayLetter(date) {
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  return days[date.getDay()]
}

function formatDisplayDate(dateStrOrObj) {
  const date = new Date(dateStrOrObj)
  return date.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })
}
</script>

<template>
  <div class="agenda-view mobile-agenda-wrapper" style="display: flex; flex-direction: column; height: 100%;">
    <!-- Toast Messages -->
    <div v-if="toastMessage" class="toast-popup" style="position: fixed; top: 1.5rem; left: 50%; transform: translateX(-50%); background-color: hsl(var(--color-danger)); color: white; padding: 1rem 1.5rem; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.25); z-index: 2000; font-weight: 600; text-align: center; max-width: 90vw; border: 2px solid hsl(var(--color-danger)/0.5); animation: slideDown 0.3s ease-out;">
      {{ toastMessage }}
    </div>

    <!-- Cabecera Superior del Calendario -->
    <div class="mobile-agenda-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 0.75rem;">
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <button @click="prevWeek" class="icon-btn" style="background: none; border: none; cursor: pointer; padding: 0.4rem; border-radius: 50%; color: hsl(var(--color-text));"><ChevronLeft /></button>
        <h2 style="font-size: 1.3rem; font-weight: 800; color: hsl(var(--color-primary-dark)); text-transform: capitalize; margin: 0;">{{ weekRangeText }}</h2>
        <button @click="nextWeek" class="icon-btn" style="background: none; border: none; cursor: pointer; padding: 0.4rem; border-radius: 50%; color: hsl(var(--color-text));"><ChevronRight /></button>
      </div>
      <div style="display: flex; gap: 0.5rem;">
        <button @click="selectCurrentWeek" class="btn-primary" style="background-color: transparent; color: hsl(var(--color-primary-dark)); border: 1px solid hsl(var(--color-primary)/0.2); box-shadow: none; font-size: 0.85rem; padding: 0.4rem 0.8rem;">Hoy</button>
        <button @click="clickAddAppt" class="btn-primary" style="padding: 0.4rem 0.8rem; border-radius: 999px; font-size: 0.85rem;"><Plus :size="16" /> Cita</button>
      </div>
    </div>

    <!-- Contenedor del Calendario Semanal Completo -->
    <div class="week-calendar-container">
      <!-- Área Deslizable -->
      <div class="week-calendar-scroll-area">
        <!-- Fila de Cabecera de Días -->
        <div class="week-calendar-header">
          <div class="time-label-spacer"></div>
          <div v-for="day in weekDays" :key="day.getTime()" class="week-header-day" :class="{ 'is-today': isToday(day) }">
            <span class="day-name">{{ getDayLetter(day) }}</span>
            <span class="day-number">{{ day.getDate() }}</span>
          </div>
        </div>

        <div class="week-calendar-grid">
          <!-- Columna Izquierda con las Horas -->
          <div class="time-labels-column">
            <div v-for="hour in timelineHours" :key="hour" class="time-label-row">
              {{ hour }}:00
            </div>
          </div>

          <!-- Cuadrícula de columnas del Calendario -->
          <div class="week-grid-body">
            <!-- Líneas horizontales divisorias de fondo -->
            <div class="grid-horizontal-lines">
              <div v-for="hour in timelineHours" :key="hour" class="grid-hour-line"></div>
            </div>

            <!-- Columnas de Citas -->
            <div v-for="day in weekDays" :key="day.getTime()" class="day-column" :class="{ 'is-today': isToday(day) }">
              <!-- Zona de clics vacíos para agendar citas en un horario específico -->
              <div class="day-column-click-trigger">
                <div v-for="hour in timelineHours" :key="hour" class="grid-hour-slot" @click="clickGrid(day, hour)"></div>
              </div>

              <!-- Indicador de Hora Actual flotante (Línea Roja) si es Hoy -->
              <div v-if="isToday(day)" class="current-time-line" :style="currentTimeLineStyle">
                <div class="current-time-dot"></div>
              </div>

              <!-- Citas del día -->
              <div 
                v-for="appt in getAppointmentsForDay(day)" 
                :key="appt.id" 
                class="appt-grid-block"
                :class="appt.status"
                :style="calculateApptPositionStyle(appt)"
                @click.stop="openAppointmentDetails(appt)"
              >
                <div class="appt-time">
                  {{ formatApptTimeRange(appt.appointment_date, appt.duration_minutes) }}
                </div>
                <div class="appt-patient">
                  {{ appt.patients?.first_name }} {{ appt.patients?.last_name }}
                </div>
                <div v-if="appt.notes" class="appt-notes">
                  {{ appt.notes }}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>

    <!-- ============================================== -->
    <!-- MODAL FLOTANTE DE CITAS (AGENDAR O DETALLES)   -->
    <!-- ============================================== -->
    <div v-if="showForm || selectedAppointment" class="modal-backdrop" @click="closeAllModals">
      <div class="modal-content" @click.stop>
        <button @click="closeAllModals" class="modal-close-btn"><X :size="20" /></button>

        <!-- A: Formulario de Nueva Cita -->
        <div v-if="showForm">
          <h3 style="margin-bottom: 1.25rem; font-weight: 700; color: hsl(var(--color-primary-dark));">Nueva Cita</h3>
          <form @submit.prevent="saveAppointment">
            <div class="input-group">
              <label class="input-label">Seleccionar Paciente</label>
              <CustomSelect
                v-model="form.selectedPatientId"
                :options="[{label: '+ Crear Nuevo Paciente', value: 'new'}, ...allPatients.map(p => ({label: `${p.first_name} ${p.last_name}${p.phone ? ' - ' + p.phone : ''}`, value: p.id}))]"
                placeholder="Seleccionar Paciente..."
              />
            </div>

            <!-- Datos del Nuevo Paciente -->
            <div v-if="form.selectedPatientId === 'new'" style="background-color: hsl(var(--color-text)/0.03); padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border: 1px dashed hsl(var(--color-primary)/0.5);">
              <p style="font-size: 0.8rem; color: var(--color-primary); font-weight: 600; margin-bottom: 0.5rem;">Datos del Nuevo Paciente</p>
              <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
                <div class="input-group" style="flex: 1; margin-bottom: 0;">
                  <input v-model="form.first_name" type="text" class="input-field" placeholder="Nombre *" required>
                </div>
                <div class="input-group" style="flex: 1; margin-bottom: 0;">
                  <input v-model="form.last_name" type="text" class="input-field" placeholder="Apellido *" required>
                </div>
              </div>
              <div class="input-group" style="margin-bottom: 0;">
                <input v-model="form.phone" type="tel" class="input-field" placeholder="Teléfono (Opcional)">
              </div>
            </div>

            <!-- Date and Time block -->
            <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
              <div class="input-group" style="flex: 1; margin-bottom: 0;">
                <label class="input-label">Fecha *</label>
                <input type="date" v-model="form.date" class="input-field" required>
              </div>
            </div>
            
            <div style="display: flex; gap: 1rem; align-items: flex-end; margin-bottom: 1rem;">
              <div class="input-group" style="flex: 1; margin-bottom: 0;">
                <label class="input-label">Inicio *</label>
                <CustomSelect v-model="form.start_time" :options="timeOptions" placeholder="00:00" allowInput />
              </div>
              <div class="input-group" style="flex: 1; margin-bottom: 0;">
                <label class="input-label">Fin *</label>
                <CustomSelect v-model="form.end_time" :options="timeOptions" placeholder="00:00" allowInput />
              </div>
            </div>

            <div class="input-group" style="margin-bottom: 1.25rem;">
              <label class="input-label" style="display: flex; align-items: center; gap: 0.25rem;">
                <FileText :size="14" /> Motivo de consulta
              </label>
              <textarea v-model="form.notes" class="input-field" rows="3" placeholder="Síntomas, parte a tratar, etc..." style="resize: vertical; border: 1px solid hsl(var(--color-text)/0.1); border-radius: 8px; padding: 0.5rem;"></textarea>
            </div>

            <div class="input-group" style="margin-bottom: 1.5rem;">
              <label class="input-label" style="display: flex; align-items: center; gap: 0.25rem;">Lugar de la consulta</label>
              <div style="display: flex; gap: 0.5rem;">
                <button type="button" @click="form.location = 'Consultorio'" :style="{ flex: 1, padding: '0.6rem', borderRadius: '999px', border: form.location === 'Consultorio' ? '2px solid hsl(var(--color-primary))' : '1px solid hsl(var(--color-text)/0.2)', backgroundColor: form.location === 'Consultorio' ? 'hsl(var(--color-primary)/0.1)' : 'transparent', color: form.location === 'Consultorio' ? 'hsl(var(--color-primary-dark))' : 'hsl(var(--color-text-muted))', fontWeight: form.location === 'Consultorio' ? '700' : '500', cursor: 'pointer', transition: 'all 0.2s' }">
                  Consultorio
                </button>
                <button type="button" @click="form.location = 'Domicilio'" :style="{ flex: 1, padding: '0.6rem', borderRadius: '999px', border: form.location === 'Domicilio' ? '2px solid hsl(var(--color-primary))' : '1px solid hsl(var(--color-text)/0.2)', backgroundColor: form.location === 'Domicilio' ? 'hsl(var(--color-primary)/0.1)' : 'transparent', color: form.location === 'Domicilio' ? 'hsl(var(--color-primary-dark))' : 'hsl(var(--color-text-muted))', fontWeight: form.location === 'Domicilio' ? '700' : '500', cursor: 'pointer', transition: 'all 0.2s' }">
                  Domicilio
                </button>
              </div>
            </div>

            <div style="display: flex; gap: 1rem;">
              <button type="button" @click="closeAllModals" class="input-field" style="flex: 1; text-align: center; cursor: pointer;">Cancelar</button>
              <button type="submit" class="btn-primary" style="flex: 1; justify-content: center; box-shadow: none;">Agendar Cita</button>
            </div>
          </form>
        </div>

        <!-- B: Detalle / Edición / Pago de Cita Existente -->
        <div v-else-if="selectedAppointment">
          <div style="margin-bottom: 1rem; border-bottom: 1px solid hsl(var(--color-text)/0.1); padding-bottom: 0.75rem;">
            <div :style="{ color: selectedAppointment.status === 'cancelled' ? 'hsl(var(--color-danger))' : (selectedAppointment.status === 'completed' ? 'hsl(var(--color-success))' : 'hsl(var(--color-primary))'), fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }">
              {{ selectedAppointment.status === 'cancelled' ? 'Cita Cancelada' : (selectedAppointment.status === 'completed' ? 'Cita Pagada' : 'Detalle de la Cita') }}
            </div>
            
            <div v-if="!isEditingAppointment" style="display: flex; align-items: center; gap: 0.4rem; font-size: 1.15rem; font-weight: 700; margin-top: 0.25rem;">
              <Clock :size="16" /> {{ formatTime(selectedAppointment.appointment_date) }} - {{ formatTime(new Date(new Date(selectedAppointment.appointment_date).getTime() + selectedAppointment.duration_minutes * 60000).toISOString()) }}
              <button v-if="selectedAppointment.status === 'scheduled'" @click="isEditingAppointment = true" class="icon-btn" style="padding: 0.2rem; margin-left: 0.5rem; color: var(--color-primary); background: none; border: none; cursor: pointer;"><Edit2 :size="14" /></button>
            </div>
          </div>

          <!-- Formulario de Edición de Horario -->
          <form v-if="isEditingAppointment" @submit.prevent="updateAppointment" style="margin-bottom: 1.25rem; background-color: hsl(var(--color-primary)/0.05); padding: 1rem; border-radius: 8px; border: 1px dashed hsl(var(--color-primary)/0.5);">
            <div class="input-group" style="margin-bottom: 0.75rem;">
              <label class="input-label" style="font-size: 0.75rem;">Fecha</label>
              <input v-model="editAppointmentForm.date" type="date" class="input-field" style="padding: 0.5rem; font-size: 0.95rem;" required>
            </div>
            <div style="display: flex; gap: 0.75rem; margin-bottom: 0.75rem;">
              <div class="input-group" style="flex: 1; margin-bottom: 0;">
                <label class="input-label" style="font-size: 0.75rem;">Inicio</label>
                <CustomSelect v-model="editAppointmentForm.start_time" :options="timeOptions" placeholder="00:00" />
              </div>
              <div class="input-group" style="flex: 1; margin-bottom: 0;">
                <label class="input-label" style="font-size: 0.75rem;">Fin</label>
                <CustomSelect v-model="editAppointmentForm.end_time" :options="timeOptions" placeholder="00:00" />
              </div>
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;">
              <button type="button" @click="isEditingAppointment = false" class="btn-primary" style="background-color: transparent; color: var(--color-text-muted); padding: 0.4rem 0.8rem; font-size: 0.85rem; box-shadow: none;">Cancelar</button>
              <button type="submit" class="btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; box-shadow: none;"><Check :size="16" /> Guardar</button>
            </div>
          </form>

          <!-- Detalles del Paciente -->
          <div v-if="!isEditingAppointment" style="margin-bottom: 1.25rem;">
            <div style="font-weight: 600; font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 0.4rem;">Paciente</div>
            <div style="background-color: hsl(var(--color-primary)/0.05); padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid hsl(var(--color-primary)/0.15); display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-weight: 700; font-size: 1rem; color: hsl(var(--color-primary-dark));">{{ selectedAppointment.patients?.first_name }} {{ selectedAppointment.patients?.last_name }}</div>
                <div v-if="selectedAppointment.patients?.phone" style="font-size: 0.8rem; color: var(--color-text-muted); margin-top: 0.1rem; display: flex; align-items: center; gap: 0.25rem;"><Phone :size="12" /> {{ selectedAppointment.patients?.phone }}</div>
              </div>
              <RouterLink :to="`/patients/${selectedAppointment.patient_id}`" @click="closeAllModals" class="btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; border-radius: 999px; background-color: hsl(var(--color-primary)/0.1); color: hsl(var(--color-primary-dark)); border: 1px solid hsl(var(--color-primary)/0.2); box-shadow: none;">Expediente</RouterLink>
            </div>
          </div>

          <!-- Notas/Motivo de Cita -->
          <div v-if="selectedAppointment.notes && !isEditingAppointment" style="margin-bottom: 1.25rem;">
            <div style="font-weight: 600; font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 0.4rem;">Motivo / Diagnóstico Clínico</div>
            <div style="background-color: hsl(var(--color-bg)); padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.9rem; border: 1px dashed hsl(var(--color-text)/0.1); line-height: 1.4;">
              {{ selectedAppointment.notes }}
            </div>
          </div>

          <!-- Detalles del Pago (si ya está pagada) -->
          <div v-if="selectedAppointmentPayment" style="margin-bottom: 1.25rem;">
            <div style="font-weight: 600; font-size: 0.85rem; color: var(--color-success); margin-bottom: 0.4rem;">Información del Pago</div>
            <div style="background-color: hsl(var(--color-success)/0.05); padding: 0.75rem 1rem; border-radius: 8px; border: 1px dashed hsl(var(--color-success)/0.3); display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 1.15rem; font-weight: 800; color: hsl(var(--color-success));">${{ selectedAppointmentPayment.amount }} MXN</span>
              <span style="font-size: 0.75rem; background: hsl(var(--color-success)/0.15); color: hsl(var(--color-success)); padding: 0.25rem 0.5rem; border-radius: 999px; font-weight: 700; text-transform: uppercase;">
                {{ translatePaymentMethod(selectedAppointmentPayment.payment_type || selectedAppointmentPayment.payment_method) }}
              </span>
            </div>
          </div>

          <!-- Acciones de la cita -->
          <div v-if="selectedAppointment.status === 'scheduled' && !isEditingAppointment">
            <!-- Formulario de Liquidación -->
            <div v-if="showPaymentForm" style="background-color: hsl(var(--color-success)/0.05); padding: 1rem; border-radius: 8px; border: 1px solid hsl(var(--color-success)/0.3); margin-bottom: 1rem;">
              <div style="font-weight: 700; color: hsl(var(--color-success)); margin-bottom: 0.5rem; font-size: 0.9rem;">Liquidar Cita</div>
              <form @submit.prevent="submitPayment" style="display: flex; flex-direction: column; gap: 0.5rem;">
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                  <div class="input-group" style="flex: 1; min-width: 110px; margin-bottom: 0;">
                    <input v-model="paymentForm.amount" type="number" step="0.01" class="input-field" placeholder="Monto ($)" required style="padding: 0.5rem; border: 1px solid hsl(var(--color-text)/0.1); border-radius: 6px;">
                  </div>
                  <div class="input-group" style="flex: 1.5; min-width: 150px; margin-bottom: 0;">
                    <CustomSelect 
                      v-model="paymentForm.payment_method" 
                      :options="[{label: 'Efectivo', value: 'cash'}, {label: 'Transferencia', value: 'transfer'}, {label: 'Tarjeta', value: 'card'}]"
                    />
                  </div>
                </div>
                <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.5rem;">
                  <button type="button" @click="showPaymentForm = false" class="btn-primary" style="background-color: transparent; color: var(--color-text-muted); padding: 0.4rem 0.8rem; font-size: 0.85rem; box-shadow: none;">Cancelar</button>
                  <button type="submit" class="btn-primary" style="background-color: hsl(var(--color-success)); color: white; padding: 0.4rem 0.8rem; font-size: 0.85rem; box-shadow: none;"><Check :size="14"/> Confirmar Pago</button>
                </div>
              </form>
            </div>

            <!-- Botones de Acción directos -->
            <div v-else style="display: flex; gap: 0.5rem;">
              <button @click="showPaymentForm = true" class="btn-primary" style="flex: 1; background-color: hsl(var(--color-success)); display: flex; justify-content: center; box-shadow: none;">
                <DollarSign :size="16" /> Liquidar Cita
              </button>
              <button @click="cancelAppointment" :disabled="isCancelling" class="btn-primary" style="background-color: hsl(var(--color-danger)/0.1); border: 1px solid hsl(var(--color-danger)/0.3); color: hsl(var(--color-danger)); padding: 0.5rem; box-shadow: none; display: flex; align-items: center; justify-content: center; min-width: 44px; transition: all 0.2s;">
                <span v-if="isCancelling" style="font-size: 0.85rem; font-weight: 600; padding: 0 0.5rem;">Cancelando...</span>
                <Trash2 v-else :size="18" />
              </button>
            </div>
          </div>
          
          <div v-else-if="selectedAppointment.status === 'cancelled' && !isEditingAppointment" style="margin-top: 1rem;">
            <button @click="deleteAppointment" :disabled="isCancelling" class="btn-primary" style="width: 100%; background-color: hsl(var(--color-danger)); color: white; display: flex; justify-content: center; box-shadow: none;">
              <Trash2 :size="16" style="margin-right: 0.25rem;" /> Eliminar Definitivamente
            </button>
          </div>

        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
@keyframes slideDown {
  from { top: -2rem; opacity: 0; }
  to { top: 1.5rem; opacity: 1; }
}
</style>
