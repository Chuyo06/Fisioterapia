import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/agenda',
      name: 'agenda',
      component: () => import('../views/AgendaView.vue')
    },
    {
      path: '/patients',
      name: 'patients',
      component: () => import('../views/PatientsView.vue')
    },
    {
      path: '/patients/:id',
      name: 'patient-detail',
      component: () => import('../views/PatientDetailView.vue')
    },
    {
      path: '/finances',
      name: 'finances',
      component: () => import('../views/FinancesView.vue')
    }
  ]
})

const routeTitles = {
  home: 'Inicio',
  agenda: 'Agenda',
  patients: 'Pacientes',
  'patient-detail': 'Expediente',
  finances: 'Finanzas'
}

router.afterEach((to) => {
  const pageName = routeTitles[to.name] || ''
  document.title = pageName ? `Fisioterapia | ${pageName}` : 'Fisioterapia'
})

export default router
