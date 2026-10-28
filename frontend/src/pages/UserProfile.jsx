import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';
import { useAlert } from '../context/AlertContext';
import { FaUserEdit, FaUserFriends, FaGlobe, FaLink, FaTwitter, FaGithub, FaLinkedin, FaPalette } from 'react-icons/fa';
import '../styles/Auth.css';

const UserProfile = () => {
  const { updateUserLocal } = useAuth();
  const { showAlert } = useAlert();
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  
  // Editable fields
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [website, setWebsite] = useState('');
  const [twitter, setTwitter] = useState('');
  const [github, setGithub] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [themePreference, setThemePreference] = useState('dark');
  const [saving, setSaving] = useState(false);
  const fallbackImage = 'https://via.placeholder.com/150';

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyTheme = (theme) => {
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  };

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/users/profile');
      const data = response.data;
      setProfile(data);
      setFullName(data.fullName || '');
      setBio(data.bio || '');
      setProfileImage(data.profileImage || '');
      setWebsite(data.website || '');
      setTwitter(data.twitter || '');
      setGithub(data.github || '');
      setLinkedin(data.linkedin || '');
      setThemePreference(data.themePreference || 'dark');
      applyTheme(data.themePreference || 'dark');
    } catch (e) {
      console.error(e);
      showAlert('Error fetching user profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        showAlert('Image size should be less than 1MB', 'warning');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await api.put('/api/users/profile', {
        fullName,
        bio,
        profileImage,
        website,
        twitter,
        github,
        linkedin,
        themePreference
      });
      setProfile(response.data);
      applyTheme(response.data.themePreference || 'dark');
      updateUserLocal({
        fullName: response.data.fullName,
        profileImage: response.data.profileImage
      });
      showAlert('Profile updated successfully!', 'success');
      setEditing(false);
    } catch (err) {
      showAlert(err.response?.data?.message || 'Error updating profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-secondary)' }}>
        Loading profile...
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="container auth-container">
      <div className="auth-card glass-card animate-fade-in" style={{ maxWidth: '560px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
          <h2 className="auth-title" style={{ fontSize: '1.8rem', margin: 0 }}>My Profile</h2>
          <button 
            type="button" 
            className="pagination-btn" 
            onClick={() => setEditing(!editing)}
            style={{ display: 'flex', gap: '8px', alignItems: 'center', height: '36px' }}
          >
            <FaUserEdit /> {editing ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {editing ? (
          <form className="auth-form" onSubmit={handleUpdate}>
            <div className="form-group" style={{ alignItems: 'center', marginBottom: '10px' }}>
              <img
                src={profileImage || fallbackImage}
                alt="Profile preview"
                onError={(e) => { e.currentTarget.src = fallbackImage; }}
                style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-primary)' }}
              />
            </div>

            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label className="form-label">Upload Profile Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="form-input"
                style={{ background: 'transparent', border: 'none', paddingLeft: 0, color: 'var(--text-secondary)' }}
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="profile-image-url">Or Avatar Image URL</label>
              <input
                type="url"
                className="form-input"
                value={profileImage}
                onChange={(e) => setProfileImage(e.target.value)}
                placeholder="Paste a direct Google image URL"
                id="profile-image-url"
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label className="form-label">About Me (Bio)</label>
              <textarea
                className="comment-textarea"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Write something interesting about yourself..."
                rows={4}
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label className="form-label"><FaLink /> Website</label>
              <input
                type="url"
                className="form-input"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourwebsite.com"
                disabled={saving}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label"><FaTwitter /> Twitter</label>
                <input
                  type="text"
                  className="form-input"
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  placeholder="@yourhandle"
                  disabled={saving}
                />
              </div>
              <div className="form-group">
                <label className="form-label"><FaGithub /> GitHub</label>
                <input
                  type="text"
                  className="form-input"
                  value={github}
                  onChange={(e) => setGithub(e.target.value)}
                  placeholder="username"
                  disabled={saving}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label"><FaLinkedin /> LinkedIn</label>
                <input
                  type="text"
                  className="form-input"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  placeholder="LinkedIn profile URL"
                  disabled={saving}
                />
              </div>
              <div className="form-group">
                <label className="form-label"><FaPalette /> Theme Preference</label>
                <select
                  className="form-input"
                  value={themePreference}
                  onChange={(e) => setThemePreference(e.target.value)}
                  disabled={saving}
                  style={{ background: 'var(--bg-secondary)', color: 'white' }}
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
              </div>
            </div>

            <button type="submit" className="btn-submit" disabled={saving}>
              {saving ? 'Saving changes...' : 'Save Profile'}
            </button>
          </form>
        ) : (
          /* Profile Details View */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <img
                src={profile.profileImage || fallbackImage}
                alt={`${profile.fullName || profile.username}'s profile`}
                onError={(e) => { e.currentTarget.src = fallbackImage; }}
                style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-primary)' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                  {profile.fullName}
                </h3>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  @{profile.username}
                </span>
                <span className="role-tag" style={{ width: 'fit-content', marginTop: '4px' }}>
                  {profile.role?.roleName}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span className="form-label">About</span>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                {profile.bio || "No biography provided yet. Keep your readers engaged by sharing some info about yourself!"}
              </p>
            </div>

            {(profile.website || profile.twitter || profile.github || profile.linkedin) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                <span className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FaGlobe /> Social Links
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {profile.website && (
                    <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noopener noreferrer" className="social-link-chip">
                      <FaLink /> Website
                    </a>
                  )}
                  {profile.twitter && (
                    <a href={`https://x.com/${profile.twitter.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="social-link-chip">
                      <FaTwitter /> {profile.twitter}
                    </a>
                  )}
                  {profile.github && (
                    <a href={`https://github.com/${profile.github}`} target="_blank" rel="noopener noreferrer" className="social-link-chip">
                      <FaGithub /> {profile.github}
                    </a>
                  )}
                  {profile.linkedin && (
                    <a href={profile.linkedin.startsWith('http') ? profile.linkedin : `https://linkedin.com/in/${profile.linkedin}`} target="_blank" rel="noopener noreferrer" className="social-link-chip">
                      <FaLinkedin /> LinkedIn
                    </a>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <FaPalette color="var(--accent-secondary)" />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Theme: <strong style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>{profile.themePreference || 'dark'}</strong>
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <FaUserFriends color="var(--accent-primary)" />
                <span style={{ fontSize: '1.4rem', fontWeight: '700' }}>{profile.followers?.length || 0}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Followers</span>
              </div>
              <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <FaGlobe color="var(--accent-secondary)" />
                <span style={{ fontSize: '1.4rem', fontWeight: '700' }}>{profile.following?.length || 0}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Following</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
