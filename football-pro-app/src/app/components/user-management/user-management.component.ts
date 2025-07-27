import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService, UserDto, UserResponseDto } from '../../services/user.service';
import { ClubService, ClubResponseDto } from '../../services/club.service';
import { FieldService, FieldResponseDto } from '../../services/field.service';

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss']
})
export class UserManagementComponent implements OnInit {
  users: UserResponseDto[] = [];
  clubs: ClubResponseDto[] = [];
  fields: FieldResponseDto[] = [];
  isLoading = false;
  showCreateModal = false;
  showEditModal = false;
  showDeleteModal = false;
  selectedUser: UserResponseDto | null = null;
  errorMessage = '';
  successMessage = '';
  isEditMode = false;

  userForm: FormGroup;

  roleTypes = [
    { value: 'USER', label: 'User' },
    { value: 'FIELD', label: 'Field' },
    { value: 'CLUB', label: 'Club' }
  ];

  constructor(
    private userService: UserService,
    private clubService: ClubService,
    private fieldService: FieldService,
    private fb: FormBuilder
  ) {
    this.userForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(120)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(50)]],
      firstName: ['', [Validators.required, Validators.maxLength(100)]],
      lastName: ['', [Validators.required, Validators.maxLength(100)]],
      roleType: ['USER', Validators.required],
      fieldId: [null],
      clubId: [null]
    });
  }

  ngOnInit(): void {
    this.loadUsers();
    this.loadClubs();
    this.loadFields();
    
    // Watch for role changes to update validation
    this.userForm.get('roleType')?.valueChanges.subscribe(roleType => {
      this.updateRoleBasedValidation(roleType);
    });
  }

  loadUsers(): void {
    this.isLoading = true;
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.errorMessage = 'Failed to load users';
        this.isLoading = false;
      }
    });
  }

  loadClubs(): void {
    this.clubService.getAllClubs().subscribe({
      next: (clubs) => {
        this.clubs = clubs;
      },
      error: (error) => {
        console.error('Error loading clubs:', error);
      }
    });
  }

  loadFields(): void {
    this.fieldService.getAllFields().subscribe({
      next: (fields) => {
        this.fields = fields;
      },
      error: (error) => {
        console.error('Error loading fields:', error);
      }
    });
  }

  updateRoleBasedValidation(roleType: string): void {
    const fieldIdControl = this.userForm.get('fieldId');
    const clubIdControl = this.userForm.get('clubId');

    if (roleType === 'FIELD') {
      fieldIdControl?.setValidators([Validators.required]);
      clubIdControl?.clearValidators();
      clubIdControl?.setValue(null);
    } else if (roleType === 'CLUB') {
      clubIdControl?.setValidators([Validators.required]);
      fieldIdControl?.clearValidators();
      fieldIdControl?.setValue(null);
    } else {
      fieldIdControl?.clearValidators();
      clubIdControl?.clearValidators();
      fieldIdControl?.setValue(null);
      clubIdControl?.setValue(null);
    }

    fieldIdControl?.updateValueAndValidity();
    clubIdControl?.updateValueAndValidity();
  }

  updatePasswordValidation(): void {
    const passwordControl = this.userForm.get('password');
    
    if (this.isEditMode) {
      // In edit mode, password is optional but if provided, must meet length requirements
      passwordControl?.setValidators([
        Validators.minLength(6), 
        Validators.maxLength(120)
      ]);
    } else {
      // In create mode, password is required
      passwordControl?.setValidators([
        Validators.required, 
        Validators.minLength(6), 
        Validators.maxLength(120)
      ]);
    }
    
    passwordControl?.updateValueAndValidity();
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.userForm.reset({ roleType: 'USER' });
    this.updatePasswordValidation();
    this.showCreateModal = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  openEditModal(user: UserResponseDto): void {
    this.isEditMode = true;
    this.selectedUser = user;
    this.userForm.patchValue({
      username: user.username,
      password: '', // Don't populate password for security
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roleType: user.roleType || user.role || 'USER', // Default to USER if not specified
      fieldId: user.fieldId || null,
      clubId: user.clubId || null
    });
    this.updatePasswordValidation();
    this.showEditModal = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  openDeleteModal(user: UserResponseDto): void {
    this.selectedUser = user;
    this.showDeleteModal = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeModals(): void {
    this.showCreateModal = false;
    this.showEditModal = false;
    this.showDeleteModal = false;
    this.selectedUser = null;
    this.isEditMode = false;
    this.userForm.reset({ roleType: 'USER' });
  }

  createUser(): void {
    if (this.userForm.valid) {
      const userData: UserDto = this.userForm.value;
      this.isLoading = true;

      this.userService.createUser(userData).subscribe({
        next: (createdUser) => {
          this.users.push(createdUser);
          this.successMessage = 'User created successfully!';
          this.closeModals();
          this.isLoading = false;
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (error) => {
          console.error('Error creating user:', error);
          this.errorMessage = 'Failed to create user';
          this.isLoading = false;
        }
      });
    }
  }

  updateUser(): void {
    if (this.userForm.valid && this.selectedUser) {
      const userData: UserDto = this.userForm.value;
      
      // Remove password from request if it's empty in edit mode
      if (this.isEditMode && !userData.password) {
        userData.password = undefined;
      }
      
      this.isLoading = true;

      this.userService.updateUser(this.selectedUser.id, userData).subscribe({
        next: (updatedUser) => {
          const index = this.users.findIndex(u => u.id === updatedUser.id);
          if (index !== -1) {
            this.users[index] = updatedUser;
          }
          this.successMessage = 'User updated successfully!';
          this.closeModals();
          this.isLoading = false;
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (error) => {
          console.error('Error updating user:', error);
          this.errorMessage = 'Failed to update user';
          this.isLoading = false;
        }
      });
    }
  }

  deleteUser(): void {
    if (this.selectedUser) {
      this.isLoading = true;

      this.userService.deleteUser(this.selectedUser.id).subscribe({
        next: () => {
          this.users = this.users.filter(u => u.id !== this.selectedUser!.id);
          this.successMessage = 'User deleted successfully!';
          this.closeModals();
          this.isLoading = false;
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (error) => {
          console.error('Error deleting user:', error);
          this.errorMessage = 'Failed to delete user';
          this.isLoading = false;
        }
      });
    }
  }

  getRoleDisplay(role: string): string {
    if (!role) return 'User';
    const roleUpper = role.toUpperCase();
    switch (roleUpper) {
      case 'ADMIN': return 'Admin';
      case 'FIELD': return 'Field';
      case 'CLUB': return 'Club';
      default: return 'User';
    }
  }

  getRoleClass(role: string): string {
    if (!role) return 'role-user';
    const roleUpper = role.toUpperCase();
    switch (roleUpper) {
      case 'ADMIN': return 'role-admin';
      case 'FIELD': return 'role-field';
      case 'CLUB': return 'role-club';
      default: return 'role-user';
    }
  }

  getFieldName(fieldId?: number): string {
    if (!fieldId) return '';
    const field = this.fields.find(f => f.id === fieldId);
    return field ? `${field.club.name} | ${field.name}` : '';
  }

  getClubName(clubId?: number): string {
    if (!clubId) return '';
    const club = this.clubs.find(c => c.id === clubId);
    return club ? club.name : '';
  }
} 