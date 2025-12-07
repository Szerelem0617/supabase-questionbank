export const useUserProfile = () => {
  const client = useSupabaseClient()
  const user = useSupabaseUser()

  // Global state for profile data
  const profile = useState('userProfile', () => null)
  const loading = useState('profileLoading', () => false)

  // --- Fetch Profile ---
  const fetchProfile = async () => {
    if (!user.value) {
        profile.value = null
        return
    }
    
    try {
      loading.value = true
      const { data, error } = await client
        .from('profiles')
        .select(`username, website, avatar_url, display_name`)
        .eq('id', user.value.id)
        .single()

      if (error) {
        if (error.code !== 'PGRST116') {
            console.error('Error fetching profile:', error)
        }
        return
      }

      if (data) {
        profile.value = {
          ...data,
          email: user.value.email,
        }
      }
    } catch (error: any) {
      console.error('Unexpected error fetching profile:', error.message)
    } finally {
      loading.value = false
    }
  }

  // --- Update Profile Info ---
  const updateProfile = async (profileData: { displayName: string, website: string }) => {
    if (!user.value) return

    try {
      loading.value = true
      const updates = {
        id: user.value.id,
        display_name: profileData.displayName,
        website: profileData.website,
        updated_at: new Date(),
      }

      // RLS: Policy "Users can insert their own profile" required for new users
      const { error } = await client.from('profiles').upsert(updates)
      if (error) throw error

      // Optimistic Update
      if (profile.value) {
        profile.value.display_name = profileData.displayName
        profile.value.website = profileData.website
      } else {
        profile.value = {
            username: user.value.email?.split('@')[0],
            avatar_url: '',
            display_name: profileData.displayName,
            website: profileData.website,
            email: user.value.email
        }
      }
      alert('Profile updated successfully!')
    } catch (error: any) {
      alert(`Database Error: ${error.message}`)
    } finally {
      loading.value = false
    }
  }

  // --- Upload Avatar ---
  const uploadAvatar = async (file: File) => {
    if (!user.value) return

    try {
      loading.value = true
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.value.id}.${fileExt}`
      const filePath = `${fileName}`

      // 1. Upload to Storage
      // RLS: Policy for "avatars" bucket required
      const { error: uploadError } = await client.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) throw new Error(`Storage Error: ${uploadError.message}`)

      // 2. Get Public URL
      const { data: urlData } = client.storage.from('avatars').getPublicUrl(filePath)
      
      const profileUpdates = {
        id: user.value.id,
        avatar_url: urlData.publicUrl,
        updated_at: new Date(),
      }

      // 3. Update Database Link
      const { error: updateError } = await client.from('profiles').upsert(profileUpdates)
      if (updateError) throw new Error(`Database Error: ${updateError.message}`)

      // 4. Optimistic Update
      if (profile.value) {
        profile.value.avatar_url = urlData.publicUrl
      } else {
         profile.value = {
             ...profileUpdates,
             email: user.value.email,
             display_name: '', // Default
             website: '',      // Default
             username: user.value.email?.split('@')[0]
         }
      }
      alert('Avatar updated successfully!')

    } catch (error: any) {
      console.error(error)
      alert(error.message)
    } finally {
      loading.value = false
    }
  }

  return {
    profile,
    loading,
    fetchProfile,
    updateProfile,
    uploadAvatar
  }
}