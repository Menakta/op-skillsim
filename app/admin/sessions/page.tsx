"use client";

/**
 * Sessions Management Page
 *
 * Displays all sessions with tabs for Students, Teachers, and Admins.
 * - Students: LTI sessions with training data from training_sessions
 * - Teachers: Teacher role sessions
 * - Admins: Admin role sessions
 */

import { useState, useMemo, useCallback } from "react";
import { Users, GraduationCap, Shield, Activity, Trash2 } from "lucide-react";
import { DashboardLayout } from "../components";
import {
  Card,
  CardContent,
  StatCard,
  SearchInput,
  LoadingState,
  TabButton,
  FilterButton,
  ExportDropdown,
  ConfirmDialog,
} from "../components";
import type {
  SessionStudent,
  SessionTeacher,
  SessionAdmin,
  StatusFilter,
  SessionTabType,
} from "../types";
import { type ExportColumn } from "../utils";
import {
  useSessions,
  useExportDynamic,
  useDeleteSessions,
  useIsLtiAdmin,
  type ExportData,
} from "../hooks";
import {
  StudentsTab,
  TeachersTab,
  AdminsTab,
  STUDENT_PDF_COLUMNS,
  TEACHER_PDF_COLUMNS,
  ADMIN_PDF_COLUMNS,
} from "./components";

// =============================================================================
// Constants
// =============================================================================

const ITEMS_PER_PAGE = 10;

// =============================================================================
// Main Component
// =============================================================================

export default function SessionsPage() {
  const { data, isLoading, error, refetch } = useSessions();
  const { isLtiAdmin } = useIsLtiAdmin();
  const deleteSessions = useDeleteSessions();

  const [activeTab, setActiveTab] = useState<SessionTabType>("students");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Modal state
  const [selectedStudent, setSelectedStudent] = useState<SessionStudent | null>(
    null,
  );
  const [selectedTeacher, setSelectedTeacher] = useState<SessionTeacher | null>(
    null,
  );
  const [selectedAdmin, setSelectedAdmin] = useState<SessionAdmin | null>(null);

  // Pagination state per tab
  const [studentPage, setStudentPage] = useState(1);
  const [teacherPage, setTeacherPage] = useState(1);
  const [adminPage, setAdminPage] = useState(1);

  // Selection state per tab
  const [selectedStudentKeys, setSelectedStudentKeys] = useState<Set<string>>(
    new Set(),
  );
  const [selectedTeacherKeys, setSelectedTeacherKeys] = useState<Set<string>>(
    new Set(),
  );
  const [selectedAdminKeys, setSelectedAdminKeys] = useState<Set<string>>(
    new Set(),
  );

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteType, setDeleteType] = useState<"selected" | "single">(
    "selected",
  );
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null);

  const students = data?.students || [];
  const teachers = data?.teachers || [];
  const admins = data?.admins || [];
  const stats = data?.stats;

  // =============================================================================
  // Filtering
  // =============================================================================

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesSearch =
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.institution.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || student.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [students, searchQuery, statusFilter]);

  const filteredTeachers = useMemo(() => {
    return teachers.filter((teacher) => {
      const matchesSearch =
        teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        teacher.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || teacher.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [teachers, searchQuery, statusFilter]);

  const filteredAdmins = useMemo(() => {
    return admins.filter((admin) => {
      const matchesSearch =
        admin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        admin.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || admin.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [admins, searchQuery, statusFilter]);

  // Reset pagination and selection when filters change
  useMemo(() => {
    setStudentPage(1);
    setTeacherPage(1);
    setAdminPage(1);
    setSelectedStudentKeys(new Set());
    setSelectedTeacherKeys(new Set());
    setSelectedAdminKeys(new Set());
  }, [searchQuery, statusFilter]);

  // =============================================================================
  // Pagination
  // =============================================================================

  const paginatedStudents = useMemo(() => {
    const start = (studentPage - 1) * ITEMS_PER_PAGE;
    return filteredStudents.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredStudents, studentPage]);

  const paginatedTeachers = useMemo(() => {
    const start = (teacherPage - 1) * ITEMS_PER_PAGE;
    return filteredTeachers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTeachers, teacherPage]);

  const paginatedAdmins = useMemo(() => {
    const start = (adminPage - 1) * ITEMS_PER_PAGE;
    return filteredAdmins.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAdmins, adminPage]);

  const studentTotalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
  const teacherTotalPages = Math.ceil(filteredTeachers.length / ITEMS_PER_PAGE);
  const adminTotalPages = Math.ceil(filteredAdmins.length / ITEMS_PER_PAGE);

  // =============================================================================
  // Export
  // =============================================================================

  const getCurrentTabData = useCallback((): ExportData<
    SessionStudent | SessionTeacher | SessionAdmin
  > => {
    switch (activeTab) {
      case "students":
        return {
          all: students,
          filtered: filteredStudents,
          selectedKeys: selectedStudentKeys,
          columns: STUDENT_PDF_COLUMNS as ExportColumn<
            SessionStudent | SessionTeacher | SessionAdmin
          >[],
          name: "Students Sessions",
        };
      case "teachers":
        return {
          all: teachers,
          filtered: filteredTeachers,
          selectedKeys: selectedTeacherKeys,
          columns: TEACHER_PDF_COLUMNS as ExportColumn<
            SessionStudent | SessionTeacher | SessionAdmin
          >[],
          name: "Teachers Sessions",
        };
      case "admins":
        return {
          all: admins,
          filtered: filteredAdmins,
          selectedKeys: selectedAdminKeys,
          columns: ADMIN_PDF_COLUMNS as ExportColumn<
            SessionStudent | SessionTeacher | SessionAdmin
          >[],
          name: "Admins Sessions",
        };
    }
  }, [
    activeTab,
    students,
    filteredStudents,
    selectedStudentKeys,
    teachers,
    filteredTeachers,
    selectedTeacherKeys,
    admins,
    filteredAdmins,
    selectedAdminKeys,
  ]);

  const {
    showExportMenu,
    setShowExportMenu,
    exportMenuRef,
    handleExportAll,
    handleExportFiltered,
    handleExportSelected,
  } = useExportDynamic(getCurrentTabData, (item) => item.id);

  // =============================================================================
  // Delete
  // =============================================================================

  const getCurrentSelectedKeys = useCallback(() => {
    switch (activeTab) {
      case "students":
        return selectedStudentKeys;
      case "teachers":
        return selectedTeacherKeys;
      case "admins":
        return selectedAdminKeys;
    }
  }, [activeTab, selectedStudentKeys, selectedTeacherKeys, selectedAdminKeys]);

  const clearCurrentSelection = useCallback(() => {
    switch (activeTab) {
      case "students":
        setSelectedStudentKeys(new Set());
        break;
      case "teachers":
        setSelectedTeacherKeys(new Set());
        break;
      case "admins":
        setSelectedAdminKeys(new Set());
        break;
    }
  }, [activeTab]);

  const handleDeleteClick = useCallback(() => {
    setDeleteType("selected");
    setSingleDeleteId(null);
    setShowDeleteConfirm(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    const ids =
      deleteType === "single" && singleDeleteId
        ? [singleDeleteId]
        : Array.from(getCurrentSelectedKeys());

    if (ids.length === 0) return;

    const typeMap = {
      students: "student",
      teachers: "teacher",
      admins: "admin",
    } as const;
    const type = typeMap[activeTab];

    try {
      await deleteSessions.mutateAsync({ ids, type });
      clearCurrentSelection();
      setSingleDeleteId(null);
      setShowDeleteConfirm(false);
      refetch();
    } catch (error) {
      console.error("Delete failed:", error);
    }
  }, [
    deleteType,
    singleDeleteId,
    getCurrentSelectedKeys,
    deleteSessions,
    activeTab,
    clearCurrentSelection,
    refetch,
  ]);

  // =============================================================================
  // Render
  // =============================================================================

  if (isLoading) {
    return (
      <DashboardLayout title="Sessions" subtitle="Manage all user sessions">
        <LoadingState message="Loading sessions..." />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Sessions" subtitle="Error loading data">
        <div className="p-6 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
          {error instanceof Error ? error.message : "Failed to load sessions"}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Sessions" subtitle="Manage all user sessions">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
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
      <div className="flex flex-wrap gap-2 mb-3">
        <TabButton
          active={activeTab === "students"}
          onClick={() => setActiveTab("students")}
          icon={<GraduationCap className="w-4 h-4" />}
          count={students.length}
        >
          Students
        </TabButton>
        <TabButton
          active={activeTab === "teachers"}
          onClick={() => setActiveTab("teachers")}
          icon={<Users className="w-4 h-4" />}
          count={teachers.length}
        >
          Teachers
        </TabButton>
        <TabButton
          active={activeTab === "admins"}
          onClick={() => setActiveTab("admins")}
          icon={<Shield className="w-4 h-4" />}
          count={admins.length}
        >
          Admins
        </TabButton>
      </div>

      {/* Filters */}
      <Card className="mb-3 lg:w-[49%] w-full">
        <CardContent className="py-4">
          <div className="flex flex-col gap-2">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={`Search ${activeTab}...`}
              className="w-full lg:w-1/2"
            />
            <div className="flex flex-wrap gap-2">
              <FilterButton
                active={statusFilter === "all"}
                onClick={() => setStatusFilter("all")}
              >
                All
              </FilterButton>
              <FilterButton
                active={statusFilter === "active"}
                onClick={() => setStatusFilter("active")}
              >
                Active
              </FilterButton>
              {activeTab === "students" && (
                <>
                  <FilterButton
                    active={statusFilter === "paused"}
                    onClick={() => setStatusFilter("paused")}
                  >
                    Paused
                  </FilterButton>
                  <FilterButton
                    active={statusFilter === "completed"}
                    onClick={() => setStatusFilter("completed")}
                  >
                    Completed
                  </FilterButton>
                </>
              )}
              {["admins", "teachers"].includes(activeTab) && (
                <FilterButton
                  active={statusFilter === "terminated"}
                  onClick={() => setStatusFilter("terminated")}
                >
                  Terminated
                </FilterButton>
              )}

              <ExportDropdown
                isOpen={showExportMenu}
                onToggle={() => setShowExportMenu(!showExportMenu)}
                menuRef={exportMenuRef}
                onExportAll={handleExportAll}
                onExportFiltered={handleExportFiltered}
                onExportSelected={handleExportSelected}
                allCount={getCurrentTabData().all.length}
                filteredCount={getCurrentTabData().filtered.length}
                selectedCount={getCurrentTabData().selectedKeys.size}
              />

              {isLtiAdmin && getCurrentSelectedKeys().size > 0 && (
                <button
                  onClick={handleDeleteClick}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete ({getCurrentSelectedKeys().size})
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab Content */}
      {activeTab === "students" && (
        <StudentsTab
          data={paginatedStudents}
          totalItems={filteredStudents.length}
          currentPage={studentPage}
          totalPages={studentTotalPages}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setStudentPage}
          selectedStudent={selectedStudent}
          setSelectedStudent={setSelectedStudent}
          selectedKeys={selectedStudentKeys}
          onSelectionChange={setSelectedStudentKeys}
          hasData={students.length > 0}
        />
      )}

      {activeTab === "teachers" && (
        <TeachersTab
          data={paginatedTeachers}
          totalItems={filteredTeachers.length}
          currentPage={teacherPage}
          totalPages={teacherTotalPages}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setTeacherPage}
          selectedTeacher={selectedTeacher}
          setSelectedTeacher={setSelectedTeacher}
          selectedKeys={selectedTeacherKeys}
          onSelectionChange={setSelectedTeacherKeys}
          hasData={teachers.length > 0}
        />
      )}

      {activeTab === "admins" && (
        <AdminsTab
          data={paginatedAdmins}
          totalItems={filteredAdmins.length}
          currentPage={adminPage}
          totalPages={adminTotalPages}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setAdminPage}
          selectedAdmin={selectedAdmin}
          setSelectedAdmin={setSelectedAdmin}
          selectedKeys={selectedAdminKeys}
          onSelectionChange={setSelectedAdminKeys}
          hasData={admins.length > 0}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        title={`Delete ${activeTab === "students" ? "Student" : activeTab === "teachers" ? "Teacher" : "Admin"} Sessions`}
        message={`Are you sure you want to delete ${deleteType === "single" ? "this session" : `${getCurrentSelectedKeys().size} selected sessions`}? ${activeTab === "students" ? "This will also delete all associated training data and quiz responses." : ""} This action cannot be undone.`}
        confirmText="Delete"
        isLoading={deleteSessions.isPending}
        variant="danger"
      />
    </DashboardLayout>
  );
}
