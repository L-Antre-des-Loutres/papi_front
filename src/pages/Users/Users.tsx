import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Page, User } from '../../types';
import { apiClient, getApiErrorMessage } from '../../api/client';
import { ENDPOINTS } from '../../api/endpoints';
import { useToastStore } from '../../context/store/toastStore';
import PageTitle from '../../components/ui/PageTitle/PageTitle';
import PageLoader from '../../components/ui/PageLoader/PageLoader';
import styles from './Users.module.css';

const DELETE_ICON = (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" width="22" height="22">
        <path d="M6.99984 9.73234C6.40214 9.38652 6.00002 8.74024 6 8.00005H0C0 5.03919 1.6085 2.45402 3.99933 1.07069L6.99981 6.26767C7.29403 6.09744 7.63564 6 8 6C8.36436 6 8.70596 6.09743 9.00017 6.26766L12.0006 1.07068C14.3915 2.45401 16 5.03918 16 8.00005H10C9.99998 8.74025 9.59785 9.38653 9.00015 9.73235L12.0007 14.9294C10.8238 15.6103 9.45742 16 8 16C6.54257 16 5.17616 15.6103 3.99932 14.9294L6.99984 9.73234Z" fill="#950000" />
    </svg>
);

const EDIT_ICON = (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" width="22" height="22">
        <path d="M8.29289 3.70711L1 11V15H5L12.2929 7.70711L8.29289 3.70711Z" fill="#000000" />
        <path d="M9.70711 2.29289L13.7071 6.29289L15.1716 4.82843C15.702 4.29799 16 3.57857 16 2.82843C16 1.26633 14.7337 0 13.1716 0C12.4214 0 11.702 0.297995 11.1716 0.828428L9.70711 2.29289Z" fill="#000000" />
    </svg>
);

interface UserFormState {
    username: string;
    password: string;
    role: string;
}

const EMPTY_FORM: UserFormState = { username: '', password: '', role: 'ROLE_USER' };

export default function Users() {
    const queryClient = useQueryClient();
    const addToast    = useToastStore((s) => s.addToast);

    const [editingUser, setEditingUser]   = useState<User | null>(null);
    const [createForm, setCreateForm]     = useState<UserFormState>(EMPTY_FORM);
    const [editForm, setEditForm]         = useState<UserFormState>(EMPTY_FORM);

    const { data: users = [], isLoading } = useQuery({
        queryKey: ['users'],
        queryFn: () => apiClient.get<Page<User>>(ENDPOINTS.users.base + '?size=200').then((p) => p.content),
    });

    const createUser = useMutation({
        mutationFn: () => apiClient.post(ENDPOINTS.users.base, createForm),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setCreateForm(EMPTY_FORM);
            addToast('User created', 'success');
        },
        onError: (err) => addToast(getApiErrorMessage(err, 'Failed to create user'), 'error'),
    });

    const updateUser = useMutation({
        mutationFn: () => {
            const body: Partial<UserFormState> = { username: editForm.username, role: editForm.role };
            if (editForm.password) body.password = editForm.password;
            return apiClient.patch(ENDPOINTS.users.byId(editingUser!.id), body);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setEditingUser(null);
            addToast('User updated', 'success');
        },
        onError: (err) => addToast(getApiErrorMessage(err, 'Failed to update user'), 'error'),
    });

    const deleteUser = useMutation({
        mutationFn: (id: number) => apiClient.delete(ENDPOINTS.users.byId(id)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            addToast('User deleted', 'success');
        },
        onError: () => addToast('Failed to delete user', 'error'),
    });

    function startEdit(user: User) {
        setEditingUser(user);
        setEditForm({ username: user.username, password: '', role: user.role });
    }

    function handleCreate() {
        if (createForm.password.length < 8) {
            addToast('Password must be at least 8 characters', 'error');
            return;
        }
        createUser.mutate();
    }

    function handleUpdate() {
        // Password is optional on edit; only validate length when the user is changing it.
        if (editForm.password && editForm.password.length < 8) {
            addToast('Password must be at least 8 characters', 'error');
            return;
        }
        updateUser.mutate();
    }

    return (
        <>
            {isLoading && <PageLoader />}
            <PageTitle title="Users" imageSrc="/img/mons/zoroark.png" />
            <h2>
                List of {users.length}{' '}
                {users.length === 1 ? 'user' : 'users'}
            </h2>

            <div className={`default-card-grid-4 ${styles.grid}`}>
                {users.map((user) => (
                    <div key={user.id} className={`form-edit-card form-edit-card-controls ${styles.card}`}>
                        <div className={styles.cardLeft}>
                            <div className={styles.avatar}>{user.username[0].toUpperCase()}</div>
                            <div>
                                <div style={{ fontWeight: 'var(--weight-semibold)' }}>{user.username}</div>
                                <span className="global-tags">{user.role.replace('ROLE_', '')}</span>
                            </div>
                        </div>
                        <div className={styles.cardActions}>
                            <button onClick={() => {
                                if (window.confirm('Delete this user?')) deleteUser.mutate(user.id);
                            }}>
                                {DELETE_ICON}
                            </button>
                            <button onClick={() => startEdit(user)}>{EDIT_ICON}</button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create form */}
            <h2>{editingUser ? 'Edit user' : 'Create user'}</h2>

            {!editingUser ? (
                <div className="form-edit-card-main">
                    <div className="form-edit-card-main-border form-edit-card-main-image-container">
                        <img
                            className="form-edit-card-main-image"
                            src="/img/mons/hoopa.png"
                            alt="hoopa"
                            style={{ imageRendering: 'auto', padding: 0, width: '16em' }}
                        />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div className="field">
                            <label className="field-label" htmlFor="create-username">Username</label>
                            <input
                                id="create-username"
                                className="global-text-input full-width"
                                type="text"
                                value={createForm.username}
                                onChange={(e) => setCreateForm((p) => ({ ...p, username: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="field">
                            <label className="field-label" htmlFor="create-password">Password</label>
                            <input
                                id="create-password"
                                className="global-text-input full-width"
                                type="password"
                                value={createForm.password}
                                onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
                                minLength={8}
                                required
                            />
                        </div>
                        <div className="field">
                            <label className="field-label" htmlFor="create-role">Role</label>
                            <select
                                id="create-role"
                                className="global-text-input full-width"
                                value={createForm.role}
                                onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value }))}
                            >
                                <option value="ROLE_USER">User</option>
                                <option value="ROLE_ADMIN">Admin</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                            <button
                                className="btn btn-validate full-width"
                                onClick={handleCreate}
                                disabled={createUser.isPending}
                            >
                                Create user
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="form-edit-card-main">
                    <div className="form-edit-card-main-border form-edit-card-main-image-container">
                        <img
                            className="form-edit-card-main-image"
                            src="/img/mons/mew.png"
                            alt="mew"
                            style={{ imageRendering: 'auto', padding: 0, width: '16em' }}
                        />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div className="field">
                            <label className="field-label" htmlFor="edit-username">Username</label>
                            <input
                                id="edit-username"
                                className="global-text-input full-width"
                                type="text"
                                value={editForm.username}
                                onChange={(e) => setEditForm((p) => ({ ...p, username: e.target.value }))}
                            />
                        </div>
                        <div className="field">
                            <label className="field-label" htmlFor="edit-password">
                                New password{' '}
                                <span style={{ fontWeight: 'var(--weight-normal)', color: 'var(--color-text-muted)' }}>
                                    (leave empty to keep current)
                                </span>
                            </label>
                            <input
                                id="edit-password"
                                className="global-text-input full-width"
                                type="password"
                                value={editForm.password}
                                onChange={(e) => setEditForm((p) => ({ ...p, password: e.target.value }))}
                                minLength={8}
                            />
                        </div>
                        <div className="field">
                            <label className="field-label" htmlFor="edit-role">Role</label>
                            <select
                                id="edit-role"
                                className="global-text-input full-width"
                                value={editForm.role}
                                onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))}
                            >
                                <option value="ROLE_USER">User</option>
                                <option value="ROLE_ADMIN">Admin</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                            <button className="btn btn-cancel" style={{ width: '50%' }} onClick={() => setEditingUser(null)}>
                                Cancel
                            </button>
                            <button
                                className="btn btn-validate"
                                style={{ width: '50%' }}
                                onClick={handleUpdate}
                                disabled={updateUser.isPending}
                            >
                                Save changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
