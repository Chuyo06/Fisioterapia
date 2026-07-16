<script setup>
import { computed } from 'vue'
import { CalendarDays, Users, CircleDollarSign, Clock, ArrowUpRight, Plus, Activity } from '@lucide/vue'
import { store } from '../store'
import { RouterLink } from 'vue-router'

const todayStr = new Date().toDateString()

// Citas para el día de hoy
const todayAppointments = computed(() => {
  return store.appointments.filter(appt => {
    if (appt.status === 'cancelled') return false
    const apptDate = new Date(appt.appointment_date)
    return apptDate.toDateString() === todayStr
  })
})

// Próxima cita de hoy (la más cercana en el futuro)
const nextAppointment = computed(() => {
  const now = new Date()
  const sorted = [...todayAppointments.value].sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date))
  return sorted.find(appt => new Date(appt.appointment_date) >= now) || sorted[0]
})

// Estadísticas de Finanzas del Mes
const monthlyRevenue = computed(() => {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  
  const thisMonthPayments = store.payments.filter(pay => {
    const payDate = new Date(pay.payment_date)
    return payDate.getMonth() === currentMonth && payDate.getFullYear() === currentYear
  })
  
  const total = thisMonthPayments.reduce((sum, p) => sum + Number(p.amount), 0)
  const cash = thisMonthPayments.filter(p => p.payment_method === 'cash').reduce((sum, p) => sum + Number(p.amount), 0)
  const card = thisMonthPayments.filter(p => p.payment_method === 'card').reduce((sum, p) => sum + Number(p.amount), 0)
  const transfer = thisMonthPayments.filter(p => p.payment_method === 'transfer').reduce((sum, p) => sum + Number(p.amount), 0)
  
  return { total, cash, card, transfer }
})

// Próximas 5 citas programadas en general
const upcomingAppointments = computed(() => {
  const now = new Date()
  return store.appointments
    .filter(appt => appt.status === 'scheduled' && new Date(appt.appointment_date) >= now)
    .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date))
    .slice(0, 5)
})

function formatTime(isoString) {
  const d = new Date(isoString)
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function formatDate(isoString) {
  const d = new Date(isoString)
  return d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
}
</script>

<template>
  <div class="dashboard-view">
    <!-- Banner de Bienvenida -->
    <div style="margin-bottom: 2rem;">
      <h1 style="font-size: 1.8rem; font-weight: 800; color: hsl(var(--color-primary-dark)); margin-bottom: 0.25rem;">Hola, Ana Sánchez</h1>
      <p style="color: var(--color-text-muted); font-size: 0.95rem; font-weight: 500;">Este es el resumen de tu consultorio de fisioterapia para el día de hoy.</p>
    </div>

    <!-- Grid de Resumen / Estadísticas Planas -->
    <div class="dashboard-grid">
      <!-- Sección Hoy -->
      <div class="flat-section" style="flex: 1;">
        <div class="flat-section-title" style="display: flex; align-items: center; gap: 0.5rem;">
          <CalendarDays :size="18" /> Citas de Hoy
        </div>
        <div style="display: flex; align-items: baseline; gap: 0.5rem; margin-bottom: 1rem;">
          <span style="font-size: 2.5rem; font-weight: 800; color: hsl(var(--color-primary-dark));">{{ todayAppointments.length }}</span>
          <span style="color: var(--color-text-muted); font-size: 0.9rem; font-weight: 600;">cita(s) programada(s)</span>
        </div>
        
        <!-- Detalle de la próxima cita -->
        <div v-if="nextAppointment" style="padding-top: 1rem; border-top: 1px solid hsl(var(--color-text)/0.05);">
          <div style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: hsl(var(--color-primary)); margin-bottom: 0.4rem;">Siguiente Paciente</div>
          <div style="font-weight: 700; font-size: 1.1rem; color: hsl(var(--color-text));">
            {{ nextAppointment.patients?.first_name }} {{ nextAppointment.patients?.last_name }}
          </div>
          <div style="display: flex; align-items: center; gap: 0.4rem; color: var(--color-text-muted); font-size: 0.85rem; margin-top: 0.25rem; font-weight: 500;">
            <Clock :size="14" /> {{ formatTime(nextAppointment.appointment_date) }}
          </div>
        </div>
        <div v-else style="padding-top: 1rem; border-top: 1px solid hsl(var(--color-text)/0.05); color: var(--color-text-muted); font-style: italic; font-size: 0.9rem;">
          No tienes más citas programadas para hoy.
        </div>
      </div>

      <!-- Sección Finanzas del Mes -->
      <div class="flat-section" style="flex: 1;">
        <div class="flat-section-title" style="display: flex; align-items: center; gap: 0.5rem;">
          <CircleDollarSign :size="18" /> Ingresos de este Mes
        </div>
        <div style="font-size: 2.5rem; font-weight: 800; color: hsl(var(--color-success)); letter-spacing: -1px; margin-bottom: 1rem;">
          ${{ monthlyRevenue.total.toFixed(2) }}
        </div>
        
        <!-- Desglose de ingresos plano -->
        <div style="display: flex; flex-direction: column; gap: 0.4rem; padding-top: 0.75rem; border-top: 1px solid hsl(var(--color-text)/0.05); font-size: 0.85rem; font-weight: 600; color: var(--color-text-muted);">
          <div style="display: flex; justify-content: space-between;">
            <span>Efectivo:</span>
            <span style="color: hsl(var(--color-text));">${{ monthlyRevenue.cash.toFixed(2) }}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Transferencias:</span>
            <span style="color: hsl(var(--color-text));">${{ monthlyRevenue.transfer.toFixed(2) }}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Tarjeta:</span>
            <span style="color: hsl(var(--color-text));">${{ monthlyRevenue.card.toFixed(2) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Accesos Rápidos -->
    <div class="flat-section">
      <div class="flat-section-title" style="margin-bottom: 1.25rem;">Acciones Rápidas</div>
      <div class="quick-actions-grid">
        <RouterLink to="/agenda" class="action-link">
          <CalendarDays :size="20" />
          <span>Ver Agenda / Calendario</span>
          <ArrowUpRight :size="16" class="arrow" />
        </RouterLink>
        <RouterLink to="/patients" class="action-link">
          <Users :size="20" />
          <span>Directorio de Pacientes</span>
          <ArrowUpRight :size="16" class="arrow" />
        </RouterLink>
        <RouterLink to="/finances" class="action-link">
          <CircleDollarSign :size="20" />
          <span>Registrar o Ver Finanzas</span>
          <ArrowUpRight :size="16" class="arrow" />
        </RouterLink>
      </div>
    </div>

    <!-- Siguientes Citas de la Semana -->
    <div class="flat-section">
      <div class="flat-section-title" style="display: flex; align-items: center; gap: 0.5rem;">
        <Activity :size="18" /> Próximas Citas Programadas
      </div>
      <div v-if="upcomingAppointments.length === 0" style="text-align: center; color: var(--color-text-muted); font-style: italic; padding: 2rem 0;">
        No hay citas futuras programadas en este momento.
      </div>
      <div v-else class="flat-list">
        <div v-for="appt in upcomingAppointments" :key="appt.id" class="flat-row" style="padding: 0.85rem 0;">
          <div style="display: flex; flex-direction: column; gap: 0.15rem;">
            <div style="font-weight: 700; color: hsl(var(--color-primary-dark)); font-size: 1.05rem;">
              {{ appt.patients?.first_name }} {{ appt.patients?.last_name }}
            </div>
            <div style="display: flex; align-items: center; gap: 0.75rem; color: var(--color-text-muted); font-size: 0.85rem; font-weight: 500; margin-top: 0.1rem;">
              <span style="display: flex; align-items: center; gap: 0.25rem;"><CalendarDays :size="13" /> {{ formatDate(appt.appointment_date) }}</span>
              <span style="display: flex; align-items: center; gap: 0.25rem;"><Clock :size="13" /> {{ formatTime(appt.appointment_date) }}</span>
            </div>
          </div>
          <RouterLink :to="`/patients/${appt.patient_id}`" class="btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; border-radius: 999px; background-color: hsl(var(--color-primary)/0.1); color: hsl(var(--color-primary-dark)); border: 1px solid hsl(var(--color-primary)/0.2); box-shadow: none;">
            Expediente
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-view {
  padding-bottom: 2rem;
}

.dashboard-grid {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

@media (min-width: 768px) {
  .dashboard-grid {
    flex-direction: row;
  }
}

/* Accesos Rápidos */
.quick-actions-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}

@media (min-width: 600px) {
  .quick-actions-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.action-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background-color: hsl(var(--color-bg));
  border: 1px solid hsl(var(--color-text)/0.06);
  border-radius: var(--border-radius-sm);
  color: hsl(var(--color-text));
  font-weight: 600;
  font-size: 0.9rem;
  transition: all var(--transition-fast);
  text-decoration: none;
  position: relative;
}

.action-link:hover {
  background-color: hsl(var(--color-primary)/0.08);
  border-color: hsl(var(--color-primary)/0.2);
  color: hsl(var(--color-primary-dark));
}

.action-link .arrow {
  margin-left: auto;
  opacity: 0.5;
  transition: transform var(--transition-fast), opacity var(--transition-fast);
}

.action-link:hover .arrow {
  opacity: 1;
  transform: translate(2px, -2px);
}
</style>
