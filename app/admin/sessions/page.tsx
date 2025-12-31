'use client'

/**
 * Sessions Management Page
 *
 * Displays all sessions with tabs for Students, Teachers, and Admins.
 * - Students: LTI sessions with training data from training_sessions
 * - Teachers: Teacher role sessions
 * - Admins: Admin role sessions
 */

import { useState, useEffect, useMemo } from 'react'
import { Users, GraduationCap, Shield, Activity } from 'lucide-react'
import { DashboardLayout } from '../components'
import {
  Card,
  CardContent,
  StatCard,
  Badge,
  ProgressBar,
  SearchInput,
  LoadingState,
  DataTable,
  MobileCardList,
  TabButton,
  FilterButton,
  StudentDetailModal,
  TeacherDetailModal,
  AdminDetailModal,
  type Column,
} from '../components'
import type {
  SessionStudent,
  SessionTeacher,
  SessionAdmin,
  StatusFilter,
  SessionTabType,
} from '../types'
import { formatDate, getInitials } from '../utils'
import { useSessions } from '../hooks'

// =============================================================================
// Constants
// =============================================================================

const ITEMS_PER_PAGE = 10

// =============================================================================
// Main Component
// =============================================================================

export default function SessionsPage() {
  const { data, isLoading, error } = useSessions()

  const [activeTab, setActiveTab] = useState<SessionTabType>('students')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedStudent, setSelectedStudent] = useState<SessionStudent | null>(null)
  const [selectedTeacher, setSelectedTeacher] = useState<SessionTeacher | null>(null)
  const [selectedAdmin, setSelectedAdmin] = useState<SessionAdmin | null>(null)

  // Separate pagination state for each tab
  const [studentPage, setStudentPage] = useState(1)
  const [teacherPage, setTeacherPage] = useState(1)
  const [adminPage, setAdminPage] = useState(1)

  const students = data?.students || []
  const teachers = data?.teachers || []
  const admins = data?.admins || []
  const stats = data?.stats

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch =
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.institution.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = statusFilter === 'all' || student.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [students, searchQuery, statusFilter])

  // Filter teachers
  const filteredTeachers = useMemo(() => {
    return teachers.filter(teacher => {
      const matchesSearch = teacher.email.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'all' || teacher.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [teachers, searchQuery, statusFilter])

  // Filter admins
  const filteredAdmins = useMemo(() => {
    return admins.filter(admin => {
      const matchesSearch = admin.email.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'all' || admin.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [admins, searchQuery, statusFilter])

  // Reset to page 1 when filters change
  useEffect(() => {
    setStudentPage(1)
    setTeacherPage(1)
    setAdminPage(1)
  }, [searchQuery, statusFilter])

  // Paginated data
  const paginatedStudents = useMemo(() => {
    const start = (studentPage - 1) * ITEMS_PER_PAGE
    return filteredStudents.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredStudents, studentPage])

  const paginatedTeachers = useMemo(() => {
    const start = (teacherPage - 1) * ITEMS_PER_PAGE
    return filteredTeachers.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredTeachers, teacherPage])

  const paginatedAdmins = useMemo(() => {
    const start = (adminPage - 1) * ITEMS_PER_PAGE
    return filteredAdmins.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredAdmins, adminPage])

  const studentTotalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE)
  const teacherTotalPages = Math.ceil(filteredTeachers.length / ITEMS_PER_PAGE)
  const adminTotalPages = Math.ceil(filteredAdmins.length / ITEMS_PER_PAGE)

  // Column configurations
  const studentColumns: Column<SessionStudent>[] = useMemo(() => [
    {
      key: 'student',
      header: 'Student',
      render: (student) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-medium text-sm">
              {getInitials(student.name)}
            </span>
          </div>
          <div className="min-w-0">
            <p className="theme-text-primary font-medium truncate">{student.name}</p>
            <p className="text-gray-500 text-xs truncate">{student.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (student) => (
        <Badge
          variant={
            student.status === 'completed' ? 'success' :
            student.status === 'active' ? 'info' : 'warning'
          }
        >
          {student.status}
        </Badge>
      ),
    },
    {
      key: 'progress',
      header: 'Progress',
      headerClassName: 'hidden lg:table-cell',
      className: 'hidden lg:table-cell',
      render: (student) => (
        <div className="w-32">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">Progress</span>
            <span className="text-white">{student.progress}%</span>
          </div>
          <ProgressBar value={student.progress} size="sm" color="teal" />
        </div>
      ),
    },
    {
      key: 'lastActive',
      header: 'Last Active',
      headerClassName: 'hidden lg:table-cell',
      className: 'hidden lg:table-cell',
      render: (student) => <span className="text-gray-400">{formatDate(student.lastActive)}</span>,
    },
  ], [])

  const teacherColumns: Column<SessionTeacher>[] = useMemo(() => [
    {
      key: 'email',
      header: 'Email',
      render: (teacher) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="theme-text-primary font-medium truncate">{teacher.email}</p>
            <p className="text-gray-500 text-xs truncate">Teacher</p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (teacher) => (
        <Badge variant={teacher.status === 'active' ? 'success' : 'warning'}>
          {teacher.status}
        </Badge>
      ),
    },
    {
      key: 'loginCount',
      header: 'Login Count',
      headerClassName: 'hidden lg:table-cell',
      className: 'hidden lg:table-cell',
      render: (teacher) => <span className="theme-text-primary">{teacher.loginCount}</span>,
    },
    {
      key: 'lastActivity',
      header: 'Last Activity',
      headerClassName: 'hidden lg:table-cell',
      className: 'hidden lg:table-cell',
      render: (teacher) => <span className="text-gray-400">{formatDate(teacher.lastActivity)}</span>,
    },
  ], [])

  const adminColumns: Column<SessionAdmin>[] = useMemo(() => [
    {
      key: 'email',
      header: 'Email',
      render: (admin) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-yellow-600 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="theme-text-primary font-medium truncate">{admin.email}</p>
            <p className="text-gray-500 text-xs truncate">Admin</p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (admin) => (
        <Badge variant={admin.status === 'active' ? 'success' : 'warning'}>
          {admin.status}
        </Badge>
      ),
    },
    {
      key: 'loginCount',
      header: 'Login Count',
      headerClassName: 'hidden lg:table-cell',
      className: 'hidden lg:table-cell',
      render: (admin) => <span className="theme-text-primary">{admin.loginCount}</span>,
    },
    {
      key: 'lastActivity',
      header: 'Last Activity',
      headerClassName: 'hidden lg:table-cell',
      className: 'hidden lg:table-cell',
      render: (admin) => <span className="text-gray-400">{formatDate(admin.lastActivity)}</span>,
    },
  ], [])

  if (isLoading) {
    return (
      <DashboardLayout title="Sessions" subtitle="Manage all user sessions">
        <LoadingState message="Loading sessions..." />
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout title="Sessions" subtitle="Error loading data">
        <div className="p-6 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
          {error instanceof Error ? error.message : 'Failed to load sessions'}
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Sessions" subtitle="Manage all user sessions">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Students"
          value={stats?.students.total || 0}
          icon={<GraduationCap className="w-5 h-5" />}
          color="purple"
        />
        <StatCard
          label="Total Teachers"
          value={stats?.teachers.total || 0}
          icon={<Users className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          label="Total Admins"
          value={stats?.admins.total || 0}
          icon={<Shield className="w-5 h-5" />}
          color="yellow"
        />
        <StatCard
          label="Avg Progress"
          value={`${stats?.students.avgProgress || 0}%`}
          icon={<Activity className="w-5 h-5" />}
          color="red"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <TabButton
          active={activeTab === 'students'}
          onClick={() => setActiveTab('students')}
          icon={<GraduationCap className="w-4 h-4" />}
          count={students.length}
        >
          Students
        </TabButton>
        <TabButton
          active={activeTab === 'teachers'}
          onClick={() => setActiveTab('teachers')}
          icon={<Users className="w-4 h-4" />}
          count={teachers.length}
        >
          Teachers
        </TabButton>
        <TabButton
          active={activeTab === 'admins'}
          onClick={() => setActiveTab('admins')}
          icon={<Shield className="w-4 h-4" />}
          count={admins.length}
        >
          Admins
        </TabButton>
      </div>

      {/* Filters */}
      <Card className="mb-6 lg:w-[49%] w-full">
        <CardContent className="py-4">
          <div className="flex flex-col gap-4">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={`Search ${activeTab}...`}
              className="w-full lg:w-1/2"
            />
            <div className="flex flex-wrap gap-2">
              <FilterButton active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
                All
              </FilterButton>
              <FilterButton active={statusFilter === 'active'} onClick={() => setStatusFilter('active')}>
                Active
              </FilterButton>
              {activeTab === 'students' && (
                <>
                  <FilterButton active={statusFilter === 'paused'} onClick={() => setStatusFilter('paused')}>
                    Paused
                  </FilterButton>
                  <FilterButton active={statusFilter === 'completed'} onClick={() => setStatusFilter('completed')}>
                    Completed
                  </FilterButton>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Tab */}
      {activeTab === 'students' && (
        <>
          <DataTable<SessionStudent>
            title="Student Sessions"
            data={paginatedStudents}
            columns={studentColumns}
            totalItems={filteredStudents.length}
            currentPage={studentPage}
            totalPages={studentTotalPages}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setStudentPage}
            onRowAction={setSelectedStudent}
            emptyIcon={<GraduationCap className="w-8 h-8 text-gray-400" />}
            emptyTitle="No students found"
            emptyDescription={students.length === 0 ? "No student sessions yet" : "Try adjusting your search or filter"}
            getRowKey={(student) => student.id}
          />
          <MobileCardList<SessionStudent>
            title="Student Sessions"
            data={paginatedStudents}
            totalItems={filteredStudents.length}
            currentPage={studentPage}
            totalPages={studentTotalPages}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setStudentPage}
            onItemClick={setSelectedStudent}
            emptyIcon={<GraduationCap className="w-8 h-8 text-gray-400" />}
            emptyTitle="No students found"
            emptyDescription={students.length === 0 ? "No student sessions yet" : "Try adjusting your search or filter"}
            getRowKey={(student) => student.id}
            renderCard={(student) => (
              <Card className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-medium text-sm">
                        {getInitials(student.name)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="theme-text-primary font-medium truncate">{student.name}</p>
                      <p className="text-gray-500 text-xs truncate">{student.email}</p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      student.status === 'completed' ? 'success' :
                      student.status === 'active' ? 'info' : 'warning'
                    }
                  >
                    {student.status}
                  </Badge>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">Progress</span>
                    <span className="text-white">{student.progress}%</span>
                  </div>
                  <ProgressBar value={student.progress} size="sm" color="teal" />
                </div>
              </Card>
            )}
          />
        </>
      )}

      {/* Teachers Tab */}
      {activeTab === 'teachers' && (
        <>
          <DataTable<SessionTeacher>
            title="Teacher Sessions"
            data={paginatedTeachers}
            columns={teacherColumns}
            totalItems={filteredTeachers.length}
            currentPage={teacherPage}
            totalPages={teacherTotalPages}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setTeacherPage}
            onRowAction={setSelectedTeacher}
            emptyIcon={<Users className="w-8 h-8 text-gray-400" />}
            emptyTitle="No teachers found"
            emptyDescription={teachers.length === 0 ? "No teacher sessions yet" : "Try adjusting your search or filter"}
            getRowKey={(teacher) => teacher.id}
          />
          <MobileCardList<SessionTeacher>
            title="Teacher Sessions"
            data={paginatedTeachers}
            totalItems={filteredTeachers.length}
            currentPage={teacherPage}
            totalPages={teacherTotalPages}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setTeacherPage}
            onItemClick={setSelectedTeacher}
            emptyIcon={<Users className="w-8 h-8 text-gray-400" />}
            emptyTitle="No teachers found"
            emptyDescription={teachers.length === 0 ? "No teacher sessions yet" : "Try adjusting your search or filter"}
            getRowKey={(teacher) => teacher.id}
            renderCard={(teacher) => (
              <Card className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="theme-text-primary font-medium truncate">{teacher.email}</p>
                      <p className="text-gray-500 text-xs">Logins: {teacher.loginCount}</p>
                    </div>
                  </div>
                  <Badge variant={teacher.status === 'active' ? 'success' : 'warning'}>
                    {teacher.status}
                  </Badge>
                </div>
              </Card>
            )}
          />
        </>
      )}

      {/* Admins Tab */}
      {activeTab === 'admins' && (
        <>
          <DataTable<SessionAdmin>
            title="Admin Sessions"
            data={paginatedAdmins}
            columns={adminColumns}
            totalItems={filteredAdmins.length}
            currentPage={adminPage}
            totalPages={adminTotalPages}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setAdminPage}
            onRowAction={setSelectedAdmin}
            emptyIcon={<Shield className="w-8 h-8 text-gray-400" />}
            emptyTitle="No admins found"
            emptyDescription={admins.length === 0 ? "No admin sessions yet" : "Try adjusting your search or filter"}
            getRowKey={(admin) => admin.id}
          />
          <MobileCardList<SessionAdmin>
            title="Admin Sessions"
            data={paginatedAdmins}
            totalItems={filteredAdmins.length}
            currentPage={adminPage}
            totalPages={adminTotalPages}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setAdminPage}
            onItemClick={setSelectedAdmin}
            emptyIcon={<Shield className="w-8 h-8 text-gray-400" />}
            emptyTitle="No admins found"
            emptyDescription={admins.length === 0 ? "No admin sessions yet" : "Try adjusting your search or filter"}
            getRowKey={(admin) => admin.id}
            renderCard={(admin) => (
              <Card className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-full bg-yellow-600 flex items-center justify-center flex-shrink-0">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="theme-text-primary font-medium truncate">{admin.email}</p>
                      <p className="text-gray-500 text-xs">Logins: {admin.loginCount}</p>
                    </div>
                  </div>
                  <Badge variant={admin.status === 'active' ? 'success' : 'warning'}>
                    {admin.status}
                  </Badge>
                </div>
              </Card>
            )}
          />
        </>
      )}

      {/* Modals */}
      {selectedStudent && (
        <StudentDetailModal student={selectedStudent} onClose={() => setSelectedStudent(null)} />
      )}
      {selectedTeacher && (
        <TeacherDetailModal teacher={selectedTeacher} onClose={() => setSelectedTeacher(null)} />
      )}
      {selectedAdmin && (
        <AdminDetailModal admin={selectedAdmin} onClose={() => setSelectedAdmin(null)} />
      )}
    </DashboardLayout>
  )
}
