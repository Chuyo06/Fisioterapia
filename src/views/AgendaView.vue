<script setup>
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabaseClient'
import { ChevronLeft, ChevronRight, Plus, Clock, Phone, FileText, Trash2, Edit2, X, Check, DollarSign } from '@lucide/vue'
import { store } from '../store'

const appointments = computed(() => store.appointments)
const allPatients = computed(() => store.patients) // Para el select

const toastMessage = ref('')
function showToast(msg) {
  toastMessage.value = msg
  setTimeout(() => { toastMessage.value = '' }, 4500)
}

// Modos de Vista
const viewMode = ref('month') // 'month' o 'day'

// Calendar state
const currentDate = ref(new Date())
const selectedDate = ref(new Date())
selectedDate.value.setHours(0,0,0,0)

// State: Forms & Modals
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
  first_name: '',
  last_name: '',
  phone: '',
  start_time: '09:00',
  end_time: '10:00',
  notes: ''
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

import CustomSelect from '../components/CustomSelect.vue'

// Time Options generator for Custom Select
const timeOptions = Array.from({ length: (21 - 7) * 4 }).map((_, i) => {
  const hour = Math.floor(i / 4) + 7
  const min = (i % 4) * 15
  const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
  
  const d = new Date()
  d.setHours(hour, min, 0)
  const label = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true })
  
  return { label, value: timeStr }
})

// --- Timeline Config ---
const timelineStartHour = 7 // 7 AM
const timelineEndHour = 21 // 9 PM
const timelineHours = Array.from({ length: timelineEndHour - timelineStartHour + 1 }, (_, i) => i + timelineStartHour)
const pixelsPerMinute = 1.5 // 1 hora = 90px

function calculateAppointmentStyle(appt) {
  const d = new Date(appt.appointment_date)
  const startHour = d.getHours()
  const startMin = d.getMinutes()
  
  // Si empieza antes del inicio de la línea de tiempo, lo ajustamos al borde superior
  let totalStartMinutes = ((startHour - timelineStartHour) * 60) + startMin
  if (totalStartMinutes < 0) totalStartMinutes = 0
  
  const heightMinutes = appt.duration_minutes || 60
  
  // Colores por defecto (scheduled) - muy bajito / blanco
  let bgColor = 'hsl(var(--color-surface))'
  let borderColor = 'hsl(var(--color-primary))'
  let textColor = 'hsl(var(--color-text))'
  
  if (appt.status === 'completed') {
    bgColor = 'hsl(var(--color-success) / 0.05)'
    borderColor = 'hsl(var(--color-success))'
    textColor = 'hsl(var(--color-success))'
  } else if (appt.status === 'cancelled') {
    bgColor = 'hsl(var(--color-danger) / 0.15)'
    borderColor = 'hsl(var(--color-danger) / 0.8)'
    textColor = 'hsl(var(--color-danger))'
    
    return {
      top: `${totalStartMinutes * pixelsPerMinute}px`,
      height: `${heightMinutes * pixelsPerMinute}px`,
      backgroundColor: bgColor,
      borderLeftColor: borderColor,
      borderRight: `4px dashed hsl(var(--color-danger))`,
      color: textColor,
      opacity: '0.9',
      textDecoration: 'line-through',
      left: '12px',
      width: 'calc(100% - 12px)',
      zIndex: 5
    }
  }

  return {
    top: `${totalStartMinutes * pixelsPerMinute}px`,
    height: `${heightMinutes * pixelsPerMinute}px`,
    backgroundColor: bgColor,
    borderLeftColor: borderColor,
    color: textColor,
    opacity: '1',
    textDecoration: 'none',
    width: 'calc(100% - 36px)',
    zIndex: 10
  }
}

// --- Calendar Config ---
const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const currentMonthName = computed(() => monthNames[currentDate.value.getMonth()])
const currentYear = computed(() => currentDate.value.getFullYear())

// Generate calendar days
const calendarDays = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  
  const days = []
  for (let i = 0; i < firstDay; i++) { days.push(null) }
  
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, month, i)
    date.setHours(0,0,0,0)
    
    const dateString = date.toISOString().split('T')[0]
    
    const dayAppointments = appointments.value.filter(appt => appt.appointment_date.startsWith(dateString))
    const dots = dayAppointments.map(appt => {
      if (appt.status === 'cancelled') return 'hsl(var(--color-danger))'
      if (appt.status === 'completed') return 'hsl(var(--color-success))'
      return 'hsl(var(--color-primary))'
    })
    
    days.push({
      date: date,
      dayNumber: i,
      dots: dots, // Array of colors
      isSelected: date.getTime() === selectedDate.value.getTime(),
      isToday: date.getTime() === new Date().setHours(0,0,0,0)
    })
  }
  
  return days
})

const selectedDayAppointments = computed(() => {
  const dateString = selectedDate.value.toISOString().split('T')[0]
  return appointments.value
    .filter(appt => appt.appointment_date.startsWith(dateString))
    .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date))
})

const todayAppointments = computed(() => {
  const today = new Date().toDateString()
  return appointments.value
    .filter(appt => new Date(appt.appointment_date).toDateString() === today)
    .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date))
})

const upcomingAppointments = computed(() => {
  const today = new Date().toDateString()
  const now = new Date()
  return appointments.value
    .filter(appt => new Date(appt.appointment_date).toDateString() !== today && new Date(appt.appointment_date) >= now)
    .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date))
})

function prevMonth() { currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() - 1, 1) }
function nextMonth() { currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1, 1) }

function selectDay(day) {
  if (day) {
    selectedDate.value = day.date
    selectedAppointment.value = null 
    showPaymentForm.value = false
    showForm.value = false
    viewMode.value = 'day' // Cambiar a la vista de línea de tiempo
  }
}

function openAppointmentDetails(appt) {
  selectedAppointment.value = appt
  showForm.value = false
  isEditingAppointment.value = false
  showPaymentForm.value = false
  paymentForm.value = { amount: '', payment_method: 'cash' }
  
  const d = new Date(appt.appointment_date)
  const dateStr = d.toISOString().split('T')[0]
  const startStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  
  // Calcular hora fin
  const dEnd = new Date(d.getTime() + (appt.duration_minutes * 60000))
  const endStr = dEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })

  editAppointmentForm.value = {
    date: dateStr,
    start_time: startStr,
    end_time: endStr
  }
}

function openDirectAppointmentDetails(appt) {
  // Ajustar la fecha seleccionada para la vista de línea de tiempo
  const d = new Date(appt.appointment_date)
  d.setHours(0,0,0,0)
  selectedDate.value = d
  
  // Cambiar a la vista del día
  viewMode.value = 'day'
  
  // Abrir los detalles
  openAppointmentDetails(appt)
}

// Helper for detecting overlaps
function hasOverlap(dateStr, startMins, endMins, excludeApptId = null) {
  return store.appointments.some(appt => {
    if (appt.status === 'cancelled') return false
    if (excludeApptId && appt.id === excludeApptId) return false
    
    const apptDate = new Date(appt.appointment_date)
    const apptDateStr = apptDate.toISOString().split('T')[0]
    
    if (apptDateStr !== dateStr) return false
    
    const apptStartMins = (apptDate.getHours() * 60) + apptDate.getMinutes()
    const apptEndMins = apptStartMins + appt.duration_minutes
    
    return startMins < apptEndMins && endMins > apptStartMins
  })
}

// Se eliminó loadData porque se carga del store

async function saveAppointment() {
  if (!form.value.start_time || !form.value.end_time) {
    alert("Completa la hora de inicio y de fin.")
    return
  }

  // Calcular duración
  const [startH, startM] = form.value.start_time.split(':').map(Number)
  const [endH, endM] = form.value.end_time.split(':').map(Number)
  const duration = ((endH * 60) + endM) - ((startH * 60) + startM)

  if (duration <= 0) {
    alert('La hora de fin debe ser posterior a la de inicio.')
    return
  }

  const dateString = selectedDate.value.toISOString().split('T')[0]
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
    const { data: newPatient, error: patError } = await supabase
      .from('patients')
      .insert([{
        first_name: form.value.first_name.trim(),
        last_name: form.value.last_name.trim(),
        phone: form.value.phone.trim()
      }])
      .select()
      
    if (patError) {
      alert("Error al registrar el nuevo paciente.")
      return
    }
    patientId = newPatient[0].id
    allPatients.value.push(newPatient[0])
    allPatients.value.sort((a, b) => a.first_name.localeCompare(b.first_name))
  }

  const datetimeString = `${dateString}T${form.value.start_time}:00`
  const appointmentDate = new Date(datetimeString)

  const { data: apptData, error: apptError } = await supabase
    .from('appointments')
    .insert([{
      patient_id: patientId,
      appointment_date: appointmentDate.toISOString(),
      duration_minutes: duration,
      notes: form.value.notes,
      status: 'scheduled'
    }])
    .select('*, patients(*)')

  if (apptError) {
    alert('Error al agendar la cita.')
  } else {
    store.appointments.push(apptData[0])
    form.value = { selectedPatientId: 'new', first_name: '', last_name: '', phone: '', start_time: '09:00', end_time: '10:00', notes: '' }
    showForm.value = false
  }
}

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
  }
}

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
    
    // Add to payments memory
    const { data: payRecord } = await supabase.from('payments').select('*, patients(first_name, last_name)').eq('appointment_id', selectedAppointment.value.id)
    if (payRecord && payRecord.length > 0) {
      store.payments.unshift(payRecord[0])
    }
  }
}

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
    }
  } finally {
    isCancelling.value = false
  }
}

function isApptInProcess(appt) {
  const now = new Date()
  const start = new Date(appt.appointment_date)
  const end = new Date(start.getTime() + (appt.duration_minutes * 60000))
  return now >= start && now <= end
}

function formatTime(isoString) {
  const date = new Date(isoString)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDisplayDate(dateStrOrObj) {
  const date = new Date(dateStrOrObj)
  return date.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })
}

function formatDisplayDateShort(dateStrOrObj) {
  const date = new Date(dateStrOrObj)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  if (date.toDateString() === today.toDateString()) return 'Hoy'
  if (date.toDateString() === tomorrow.toDateString()) return 'Mañana'
  
  return date.toLocaleDateString([], { day: 'numeric', month: 'short' })
}
</script>

<template>
  <div class="calendar-layout">
    <div v-if="toastMessage" style="position: fixed; top: 1.5rem; left: 50%; transform: translateX(-50%); background-color: hsl(var(--color-danger)); color: white; padding: 1rem 1.5rem; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.25); z-index: 1000; font-weight: 600; text-align: center; max-width: 90vw; border: 2px solid hsl(var(--color-danger)/0.5); animation: slideDown 0.3s ease-out;">
      {{ toastMessage }}
    </div>
    
    <!-- ============================================== -->
    <!-- MODO MES: CALENDARIO Y CITAS                   -->
    <!-- ============================================== -->
    <div v-if="viewMode === 'month'" class="agenda-month-layout">
      
      <!-- CONTENEDOR CALENDARIO -->
      <div class="agenda-calendar-section">
      <div style="background-color: hsl(var(--color-surface)); border-radius: var(--border-radius-lg); padding: 1rem; margin-bottom: 1rem; box-shadow: var(--shadow-sm);">
        <div class="calendar-header" style="position: relative; padding-bottom: 0.5rem; margin-bottom: 1rem; margin-top: 0;">
      <div class="month-header">
        <button @click="prevMonth" class="icon-btn"><ChevronLeft /></button>
        <h2 class="month-title">{{ currentMonthName }} {{ currentYear }}</h2>
        <button @click="nextMonth" class="icon-btn"><ChevronRight /></button>
      </div>
      </div>

      <div class="weekdays">
        <div v-for="day in daysOfWeek" :key="day" class="weekday">{{ day }}</div>
      </div>

      <div class="calendar-grid">
        <div 
          v-for="(day, index) in calendarDays" 
          :key="index"
          @click="selectDay(day)"
          :class="['day-cell', 
                   { 'empty': !day }, 
                   { 'selected': day?.isSelected }, 
                   { 'today': day?.isToday }]"
        >
          <span v-if="day" class="day-number">{{ day.dayNumber }}</span>
          <div v-if="day && day.dots.length > 0" class="dots-container">
            <div v-for="(color, idx) in day.dots" :key="idx" class="appointment-dot" :style="{ backgroundColor: color }"></div>
          </div>
        </div>
      </div>
      </div>
      </div> <!-- Fin CONTENEDOR CALENDARIO -->

      <!-- CITAS HOY Y PRÓXIMAS -->
      <div class="agenda-lists-section">
      
      <!-- Citas de Hoy -->
      <div style="background-color: hsl(var(--color-surface)); border-radius: var(--border-radius-lg); padding: 1rem; margin-bottom: 1rem; box-shadow: var(--shadow-sm);">
        <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; color: var(--color-text); text-align: center;">Citas Hoy</h3>
        <div v-if="todayAppointments.length === 0" style="text-align: center; color: var(--color-text-muted); padding: 1.5rem 1rem; background: hsl(var(--color-text)/0.03); border-radius: var(--border-radius-md); border: 1px dashed hsl(var(--color-text)/0.1);">
          No hay citas para el día de hoy.
        </div>
        <div v-else style="display: flex; flex-direction: column; gap: 0.75rem; max-height: 280px; overflow-y: auto; padding-right: 0.5rem;">
        <div v-for="appt in todayAppointments" :key="appt.id" class="card" :style="{ padding: '1rem', borderLeft: `4px solid ${appt.status === 'cancelled' ? 'hsl(var(--color-danger))' : (appt.status === 'completed' ? 'hsl(var(--color-success))' : 'hsl(var(--color-primary))')}`, cursor: 'pointer', opacity: appt.status === 'cancelled' ? '0.6' : '1' }" @click="openDirectAppointmentDetails(appt)">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="display: flex; flex-direction: column; gap: 0.25rem;">
              <div style="font-weight: 700; display: flex; align-items: center; gap: 0.4rem;">
                <span :style="{ textDecoration: appt.status === 'cancelled' ? 'line-through' : 'none' }">{{ appt.patients?.first_name }} {{ appt.patients?.last_name }}</span>
                <Check v-if="appt.status === 'completed'" :size="14" style="color: hsl(var(--color-success));" />
              </div>
              <div>
                <span v-if="appt.status === 'cancelled'" style="font-size: 0.65rem; background: hsl(var(--color-danger)/0.15); color: hsl(var(--color-danger)); padding: 0.15rem 0.4rem; border-radius: 4px; text-transform: uppercase; font-weight: 700;">Cancelada</span>
                <span v-else-if="appt.status === 'completed'" style="font-size: 0.65rem; background: hsl(var(--color-success)/0.15); color: hsl(var(--color-success)); padding: 0.15rem 0.4rem; border-radius: 4px; text-transform: uppercase; font-weight: 700;">Pagada</span>
                <span v-else-if="isApptInProcess(appt)" style="font-size: 0.65rem; background: hsl(var(--color-primary)/0.15); color: hsl(var(--color-primary)); padding: 0.15rem 0.4rem; border-radius: 4px; text-transform: uppercase; font-weight: 700;">En proceso</span>
                <span v-else style="font-size: 0.65rem; background: hsl(var(--color-text)/0.1); color: hsl(var(--color-text-muted)); padding: 0.15rem 0.4rem; border-radius: 4px; text-transform: uppercase; font-weight: 700;">Pendiente</span>
              </div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.4rem; color: var(--color-text-muted); font-size: 0.85rem; margin-top: 0.4rem;">
            <Clock :size="14" /> {{ formatTime(appt.appointment_date) }} - {{ formatTime(new Date(new Date(appt.appointment_date).getTime() + appt.duration_minutes * 60000).toISOString()) }}
          </div>
          </div>
        </div>
      </div>


      <!-- Próximas Citas (Futuras) -->
      <div style="background-color: hsl(var(--color-surface)); border-radius: var(--border-radius-lg); padding: 1rem; box-shadow: var(--shadow-sm);">
        <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; color: var(--color-text); text-align: center;">Próximas Citas</h3>
        <div v-if="upcomingAppointments.length === 0" style="text-align: center; color: var(--color-text-muted); padding: 1.5rem 1rem; background: hsl(var(--color-text)/0.03); border-radius: var(--border-radius-md); border: 1px dashed hsl(var(--color-text)/0.1);">
          No tienes citas próximas agendadas.
        </div>
        <div v-else style="display: flex; flex-direction: column; gap: 0.75rem; max-height: 280px; overflow-y: auto; padding-right: 0.5rem;">
        <div v-for="appt in upcomingAppointments" :key="appt.id" class="card" :style="{ padding: '1rem', borderLeft: `4px solid ${appt.status === 'cancelled' ? 'hsl(var(--color-danger))' : (appt.status === 'completed' ? 'hsl(var(--color-success))' : 'hsl(var(--color-primary))')}`, cursor: 'pointer', opacity: appt.status === 'cancelled' ? '0.6' : '1' }" @click="openDirectAppointmentDetails(appt)">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="display: flex; flex-direction: column; gap: 0.25rem;">
              <div style="font-weight: 700; display: flex; align-items: center; gap: 0.4rem;">
                <span :style="{ textDecoration: appt.status === 'cancelled' ? 'line-through' : 'none' }">{{ appt.patients?.first_name }} {{ appt.patients?.last_name }}</span>
                <Check v-if="appt.status === 'completed'" :size="14" style="color: hsl(var(--color-success));" />
              </div>
              <div>
                <span v-if="appt.status === 'cancelled'" style="font-size: 0.65rem; background: hsl(var(--color-danger)/0.15); color: hsl(var(--color-danger)); padding: 0.15rem 0.4rem; border-radius: 4px; text-transform: uppercase; font-weight: 700;">Cancelada</span>
                <span v-else-if="appt.status === 'completed'" style="font-size: 0.65rem; background: hsl(var(--color-success)/0.15); color: hsl(var(--color-success)); padding: 0.15rem 0.4rem; border-radius: 4px; text-transform: uppercase; font-weight: 700;">Pagada</span>
                <span v-else-if="isApptInProcess(appt)" style="font-size: 0.65rem; background: hsl(var(--color-primary)/0.15); color: hsl(var(--color-primary)); padding: 0.15rem 0.4rem; border-radius: 4px; text-transform: uppercase; font-weight: 700;">En proceso</span>
                <span v-else style="font-size: 0.65rem; background: hsl(var(--color-text)/0.1); color: hsl(var(--color-text-muted)); padding: 0.15rem 0.4rem; border-radius: 4px; text-transform: uppercase; font-weight: 700;">Pendiente</span>
              </div>
            </div>
            <div style="font-size: 0.8rem; font-weight: 700; color: hsl(var(--color-text-muted)); text-transform: uppercase;">{{ formatDisplayDateShort(appt.appointment_date) }}</div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.4rem; color: var(--color-text-muted); font-size: 0.85rem; margin-top: 0.4rem;">
            <Clock :size="14" /> {{ formatTime(appt.appointment_date) }} - {{ formatTime(new Date(new Date(appt.appointment_date).getTime() + appt.duration_minutes * 60000).toISOString()) }}
          </div>
        </div>
      </div>
      </div>
    </div>

    <!-- ============================================== -->
    <!-- MODO DÍA: LÍNEA DE TIEMPO                      -->
    <!-- ============================================== -->
    <div v-if="viewMode === 'day'" class="day-view-container">
      
      <!-- Sticky Header del Día -->
      <div class="day-sticky-header">
        <button @click="viewMode = 'month'" class="icon-btn" style="padding-left: 0;">
          <ChevronLeft /> Atrás
        </button>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
          <h2 style="font-size: 1.1rem; font-weight: 700; text-transform: capitalize; color: hsl(var(--color-primary-dark)); background-color: hsl(var(--color-primary)/0.15); padding: 0.4rem 1rem; border-radius: 999px; margin: 0; border: 1px solid hsl(var(--color-primary)/0.2);">
            {{ formatDisplayDate(selectedDate) }}
          </h2>
          <button v-if="!showForm && !selectedAppointment" @click="showForm = true" class="btn-primary" style="padding: 0.4rem 0.8rem; border-radius: 999px; font-size: 0.85rem;">
            <Plus :size="16" /> Cita
          </button>
        </div>
      </div>

      <!-- Formularios y Detalles Flotantes -->
      <div v-if="showForm" class="card form-card" style="margin-top: 1rem;">
        <form @submit.prevent="saveAppointment">
          <div class="input-group" style="margin-bottom: 1rem;">
            <label class="input-label">Seleccionar Paciente</label>
            <CustomSelect
              v-model="form.selectedPatientId"
              :options="[{label: '+ Crear Nuevo Paciente', value: 'new'}, ...allPatients.map(p => ({label: `${p.first_name} ${p.last_name}`, value: p.id}))]"
              placeholder="Seleccionar Paciente..."
            />
          </div>

          <div v-if="form.selectedPatientId === 'new'" style="background-color: hsl(var(--color-text)/0.03); padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border: 1px dashed hsl(var(--color-primary)/0.5);">
            <p style="font-size: 0.8rem; color: var(--color-primary); font-weight: 600; margin-bottom: 0.5rem;">Datos del Nuevo Paciente</p>
            <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
              <div class="input-group" style="flex: 1; margin-bottom: 0;">
                <input v-model="form.first_name" type="text" class="input-field" placeholder="Nombre *">
              </div>
              <div class="input-group" style="flex: 1; margin-bottom: 0;">
                <input v-model="form.last_name" type="text" class="input-field" placeholder="Apellido *">
              </div>
            </div>
            <div class="input-group" style="margin-bottom: 0;">
              <input v-model="form.phone" type="tel" class="input-field" placeholder="Teléfono (Opcional)">
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

          <div class="input-group" style="margin-bottom: 1rem;">
            <label class="input-label" style="display: flex; align-items: center; gap: 0.25rem;">
              <FileText :size="14" /> Caso Clínico / Problemas
            </label>
            <textarea v-model="form.notes" class="input-field" rows="3" placeholder="Opcional..." style="resize: vertical;"></textarea>
          </div>

          <div style="display: flex; gap: 1rem;">
            <button type="button" @click="showForm = false" class="input-field" style="flex: 1; text-align: center; cursor: pointer;">Cancelar</button>
            <button type="submit" class="btn-primary" style="flex: 1;">Guardar Cita</button>
          </div>
        </form>
      </div>

      <!-- Visualizar Citas del Día (Fuera del formulario) -->
      <div v-if="showForm" style="margin-top: 1rem; margin-bottom: 2rem;">
        <p style="font-size: 1.1rem; font-weight: 700; color: var(--color-text); margin-bottom: 0.75rem;">Ocupación de este día:</p>
        <div v-if="selectedDayAppointments.length === 0" style="font-size: 0.9rem; color: var(--color-text-muted); font-style: italic; background: hsl(var(--color-surface)); padding: 1rem; border-radius: 8px; text-align: center; box-shadow: var(--shadow-sm);">
          Día completamente libre.
        </div>
        <div v-else style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 250px; overflow-y: auto; padding-right: 0.25rem;">
          <div v-for="appt in selectedDayAppointments" :key="appt.id" 
               class="card"
               style="font-size: 0.95rem; padding: 1rem; border-left: 4px solid;" 
               :style="{ 
                 borderColor: appt.status === 'cancelled' ? 'hsl(var(--color-danger))' : 'hsl(var(--color-primary))',
                 backgroundColor: appt.status === 'cancelled' ? 'hsl(var(--color-danger)/0.03)' : 'hsl(var(--color-surface))',
                 opacity: appt.status === 'cancelled' ? '0.7' : '1'
               }">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <span style="font-weight: 700; color: var(--color-primary-dark);">{{ formatTime(appt.appointment_date) }} - {{ formatTime(new Date(new Date(appt.appointment_date).getTime() + appt.duration_minutes * 60000).toISOString()) }}</span> • {{ appt.patients?.first_name }} {{ appt.patients?.last_name }}
              </div>
              <span v-if="appt.status === 'cancelled'" style="font-size: 0.7rem; background: hsl(var(--color-danger)/0.15); color: hsl(var(--color-danger)); padding: 0.15rem 0.5rem; border-radius: 4px; font-weight: 700; text-transform: uppercase;">Cancelada</span>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="selectedAppointment" class="card detail-card" style="margin-top: 1rem; border-width: 2px; border-style: solid;" :style="{ borderColor: selectedAppointment.status === 'cancelled' ? 'hsl(var(--color-danger))' : (selectedAppointment.status === 'completed' ? 'hsl(var(--color-success))' : 'hsl(var(--color-primary))') }">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; border-bottom: 1px solid hsl(var(--color-text)/0.1); padding-bottom: 0.5rem;">
          <div style="flex: 1; padding-right: 1rem;">
            <div :style="{ color: selectedAppointment.status === 'cancelled' ? 'hsl(var(--color-danger))' : (selectedAppointment.status === 'completed' ? 'hsl(var(--color-success))' : 'hsl(var(--color-primary))'), fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }">
              {{ selectedAppointment.status === 'cancelled' ? 'Cita Cancelada' : (selectedAppointment.status === 'completed' ? 'Cita Pagada/Liquidada' : 'Detalle de la Cita') }}
            </div>
            <div v-if="!isEditingAppointment" style="display: flex; align-items: center; gap: 0.4rem; font-size: 1.1rem; font-weight: 600; margin-top: 0.25rem; text-decoration: selectedAppointment.status === 'cancelled' ? 'line-through' : 'none';">
              <Clock :size="16" /> {{ formatTime(selectedAppointment.appointment_date) }} - {{ formatTime(new Date(new Date(selectedAppointment.appointment_date).getTime() + selectedAppointment.duration_minutes * 60000).toISOString()) }}
              <button v-if="selectedAppointment.status === 'scheduled'" @click="isEditingAppointment = true" class="icon-btn" style="padding: 0.2rem; margin-left: 0.5rem; color: var(--color-primary);"><Edit2 :size="14" /></button>
            </div>
          </div>
          <button @click="selectedAppointment = null" class="icon-btn" style="background-color: hsl(var(--color-text)/0.05); padding: 0.3rem; margin-left: 1rem;"><X :size="18" /></button>
        </div>

        <form v-if="isEditingAppointment" @submit.prevent="updateAppointment" style="margin-bottom: 1.5rem; background-color: hsl(var(--color-primary)/0.05); padding: 1rem; border-radius: var(--border-radius-md); border: 1px dashed hsl(var(--color-primary)/0.5);">
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
            <button type="button" @click="isEditingAppointment = false" class="btn-primary" style="background-color: transparent; color: var(--color-text-muted); padding: 0.5rem 1rem; font-size: 0.9rem;">Cancelar</button>
            <button type="submit" class="btn-primary" style="padding: 0.5rem 1rem; font-size: 0.9rem;"><Check :size="16" /> Guardar</button>
          </div>
        </form>

        <div v-if="!isEditingAppointment" style="margin-bottom: 1.5rem;">
          <div style="font-weight: 600; font-size: 0.9rem; color: var(--color-text-muted); margin-bottom: 0.5rem; text-align: center;">Información del Paciente</div>
          <div style="background-color: hsl(var(--color-primary)/0.05); padding: 1rem; border-radius: var(--border-radius-md); text-align: center; border: 1px solid hsl(var(--color-primary)/0.15);" :style="{ opacity: selectedAppointment.status === 'cancelled' ? '0.6' : '1' }">
            <div style="font-weight: 700; font-size: 1.1rem; color: hsl(var(--color-primary-dark));">{{ selectedAppointment.patients.first_name }} {{ selectedAppointment.patients.last_name }}</div>
            <div v-if="selectedAppointment.patients.phone" style="display: flex; justify-content: center; align-items: center; gap: 0.4rem; margin-top: 0.4rem; color: var(--color-text-muted); font-size: 0.9rem; font-weight: 600;">
              <Phone :size="14" /> {{ selectedAppointment.patients.phone }}
            </div>
            <div v-else style="color: var(--color-text-muted); font-size: 0.85rem; margin-top: 0.4rem; font-style: italic;">Sin teléfono registrado</div>
          </div>
        </div>

        <div v-if="selectedAppointment.notes" style="margin-bottom: 1.5rem;">
          <div style="font-weight: 600; font-size: 0.9rem; color: var(--color-text-muted); margin-bottom: 0.5rem; text-align: center;">Caso Clínico / Problemas</div>
          <div style="background-color: hsl(var(--color-primary)/0.05); padding: 1rem; border-radius: var(--border-radius-md); font-size: 0.95rem; color: hsl(var(--color-text)); border: 1px dashed hsl(var(--color-primary)/0.3); text-align: center;">
            {{ selectedAppointment.notes }}
          </div>
        </div>

        <!-- Detalle del Pago (Si está pagada) -->
        <div v-if="selectedAppointmentPayment" style="margin-bottom: 1.5rem;">
          <div style="font-weight: 600; font-size: 0.9rem; color: var(--color-success); margin-bottom: 0.5rem; text-align: center;">Detalle del Pago</div>
          <div style="background-color: hsl(var(--color-success)/0.1); padding: 1rem; border-radius: var(--border-radius-md); border: 1px dashed hsl(var(--color-success)/0.3); display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 1.3rem; font-weight: 800; color: hsl(var(--color-success));">
              ${{ selectedAppointmentPayment.amount }} MXN
            </div>
            <div style="font-size: 0.8rem; background: hsl(var(--color-success)/0.2); color: hsl(var(--color-success)); padding: 0.3rem 0.6rem; border-radius: 999px; font-weight: 700; text-transform: uppercase;">
              {{ selectedAppointmentPayment.payment_type === 'cash' ? 'Efectivo' : (selectedAppointmentPayment.payment_type === 'card' ? 'Tarjeta' : 'Transferencia') }}
            </div>
          </div>
        </div>

        <!-- Acciones -->
        <div v-if="selectedAppointment.status === 'scheduled'">
          <div v-if="showPaymentForm" style="background-color: var(--color-success-bg); padding: 1rem; border-radius: 8px; border: 1px solid var(--color-success); margin-bottom: 1rem;">
            <div style="font-weight: 700; color: var(--color-success); margin-bottom: 0.5rem; font-size: 0.9rem;">Liquidar Cita</div>
            <form @submit.prevent="submitPayment" style="display: flex; flex-direction: column; gap: 0.5rem;">
              <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <div class="input-group" style="flex: 1; min-width: 110px; margin-bottom: 0;">
                  <input v-model="paymentForm.amount" type="number" step="0.01" class="input-field" placeholder="Monto ($)" required style="padding: 0.5rem;">
                </div>
                <div class="input-group" style="flex: 1.5; min-width: 150px; margin-bottom: 0;">
                  <CustomSelect 
                    v-model="paymentForm.payment_method" 
                    :options="[{label: 'Efectivo', value: 'cash'}, {label: 'Transferencia', value: 'transfer'}, {label: 'Tarjeta', value: 'card'}]"
                  />
                </div>
              </div>
              <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.5rem;">
                <button type="button" @click="showPaymentForm = false" class="btn-primary" style="background-color: transparent; color: var(--color-text-muted); padding: 0.4rem 0.8rem; font-size: 0.85rem;">Cancelar</button>
                <button type="submit" class="btn-primary" style="background-color: var(--color-success); padding: 0.4rem 0.8rem; font-size: 0.85rem;"><Check :size="14"/> Confirmar Pago</button>
              </div>
            </form>
          </div>

          <div v-else style="display: flex; gap: 0.5rem;">
            <button @click="showPaymentForm = true" class="btn-primary" style="flex: 1; background-color: hsl(var(--color-success)); display: flex; justify-content: center; box-shadow: var(--shadow-sm);">
              <DollarSign :size="16" /> Liquidar Cita
            </button>
            <button @click="cancelAppointment" :disabled="isCancelling" class="btn-primary" style="background-color: hsl(var(--color-danger)/0.1); border: 1px solid hsl(var(--color-danger)/0.3); color: hsl(var(--color-danger)); padding: 0.5rem; box-shadow: var(--shadow-sm); display: flex; align-items: center; justify-content: center; min-width: 44px; transition: all 0.2s;">
              <span v-if="isCancelling" style="font-size: 0.85rem; font-weight: 600; padding: 0 0.5rem;">Cancelando...</span>
              <Trash2 v-else :size="18" />
            </button>
          </div>
        </div>
      </div>

      <!-- Timeline visual (Se oculta si hay un formulario o detalle abierto por claridad) -->
      <div v-show="!showForm && !selectedAppointment" class="timeline-wrapper">
        <div class="timeline-container">
          
          <!-- Marcas de horas -->
          <div v-for="hour in timelineHours" :key="hour" class="timeline-hour">
            <div class="time-label">{{ hour }}:00</div>
            <div class="time-track"></div>
          </div>

          <!-- Bloques de Citas -->
          <div class="appointments-layer">
            <div v-for="appt in selectedDayAppointments" :key="appt.id" 
                 class="appt-block"
                 :style="calculateAppointmentStyle(appt)"
                 @click="openAppointmentDetails(appt)">
              
              <div style="font-weight: 700; font-size: 0.85rem; line-height: 1.1;">
                {{ appt.patients?.first_name }} {{ appt.patients?.last_name }}
              </div>
              <div style="font-size: 0.75rem; opacity: 0.8; margin-top: 0.2rem;">
                {{ formatTime(appt.appointment_date) }} - {{ formatTime(new Date(new Date(appt.appointment_date).getTime() + appt.duration_minutes * 60000).toISOString()) }}
              </div>
              
              <div v-if="appt.status === 'completed'" style="font-size: 0.65rem; text-transform: uppercase; margin-top: 0.3rem; font-weight: 700;">
                <Check :size="10" style="display: inline; vertical-align: middle;"/> Pagada
              </div>
              
              <div v-if="appt.notes && appt.duration_minutes >= 30" style="font-size: 0.7rem; margin-top: 0.4rem; opacity: 0.85; font-style: italic; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;">
                {{ appt.notes }}
              </div>
              
            </div>
          </div>
          
        </div>
      </div>

    </div>

  </div>
</template>

<style scoped>
.calendar-layout { display: flex; flex-direction: column; height: 100%; }
.month-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.month-title { font-size: 1.25rem; font-weight: 700; text-transform: capitalize; }
.calendar-sticky-header { position: relative; background-color: transparent; padding-top: 0.5rem; margin-bottom: 0.5rem; }
.icon-btn { background: none; border: none; color: hsl(var(--color-text)); cursor: pointer; padding: 0.5rem; border-radius: 50%; transition: background-color var(--transition-fast); display: flex; align-items: center; justify-content: center; }
.icon-btn:hover { background-color: hsl(var(--color-text) / 0.05); }
.weekdays { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-size: 0.75rem; font-weight: 600; color: hsl(var(--color-text-muted)); margin-bottom: 0.5rem; }
.calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-bottom: 1.5rem; }
.day-cell { aspect-ratio: 1; background-color: transparent; border-radius: var(--border-radius-sm); display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 0; cursor: pointer; position: relative; transition: background-color var(--transition-fast); }

/* --- Responsive Split Layout --- */
.agenda-month-layout {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  height: 100%;
}

@media (min-width: 900px) {
  .agenda-month-layout {
    flex-direction: row;
    align-items: flex-start;
  }
  .agenda-calendar-section {
    flex: 0 0 450px; /* Ancho fijo para el calendario en PC */
    position: sticky;
    top: 5rem;
  }
  .agenda-lists-section {
    flex: 1;
    min-width: 0;
  }
}

@keyframes slideDown {
  from { top: -2rem; opacity: 0; }
  to { top: 1.5rem; opacity: 1; }
}

.day-cell:not(.empty):hover { background-color: hsl(var(--color-primary) / 0.1); }
.day-cell.empty { cursor: default; }
.day-cell.today .day-number { color: hsl(var(--color-primary)); font-weight: 700; }
.day-cell.selected { background-color: hsl(var(--color-primary) / 0.15); border-radius: 50%; }
.day-cell.selected .day-number { color: hsl(var(--color-primary-dark)); font-weight: 700; }
.day-number { font-size: 0.95rem; margin-bottom: 0.5rem; }
.dots-container { display: flex; gap: 3px; justify-content: center; position: absolute; bottom: 0.3rem; flex-wrap: wrap; max-width: 80%; }
.appointment-dot { width: 4px; height: 4px; border-radius: 50%; }

/* --- Modo Día (Timeline) --- */
.day-view-container {
  display: flex;
  flex-direction: column;
}
.day-sticky-header {
  position: relative; 
  background-color: transparent; 
  z-index: 20; 
  padding-top: 0.5rem; 
  padding-bottom: 0.5rem;
}
.form-card { border: 2px solid hsl(var(--color-primary)); padding: 1rem; }

/* Timeline Visual */
.timeline-wrapper {
  margin-top: 1.5rem;
  padding-bottom: 2rem;
}
.timeline-container {
  position: relative;
}
.timeline-hour {
  display: flex;
  height: 90px; /* pixelsPerMinute (1.5) * 60 */
}
.time-label {
  width: 50px;
  text-align: right;
  padding-right: 0.5rem;
  font-size: 0.8rem;
  color: hsl(var(--color-text-muted));
  transform: translateY(-0.6rem); /* Alinear con la línea */
}
.time-track {
  flex: 1;
  border-top: 1px solid hsl(var(--color-text)/0.1);
  border-left: 1px solid hsl(var(--color-text)/0.1);
}

.appointments-layer {
  position: absolute;
  top: 0;
  left: 50px; /* Offset for time-label */
  right: 0;
  bottom: 0;
}
.appt-block {
  position: absolute;
  left: 10px;
  right: 10px;
  border-left: 4px solid;
  border-radius: 6px;
  padding: 0.5rem;
  overflow: hidden;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}
.appt-block:hover {
  transform: translateX(2px);
  box-shadow: var(--shadow-md);
  z-index: 5;
}
</style>
