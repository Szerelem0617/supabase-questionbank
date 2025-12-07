export const useUserProfile = () => {
  const client = useSupabaseClient()
  const user = useSupabaseUser()

  // Global state for profile data
  const profile = useState('userProfile', () => null)
  const loading = useState('profileLoading', () => false)

  // --- Fetch Profile ---
  const fetchProfile = async () => {
    try {
      loading.value = true
      
      // Mimic Vue store: Get session directly to ensure valid token
      const { data: sessionData, error: sessionError } = await client.auth.getSession()
      if (sessionError) throw sessionError
      if (!sessionData.session) {
          profile.value = null
          return
      }

      const { user: currentUser } = sessionData.session

      const { data, error } = await client
        .from('profiles')
        .select(`username, website, avatar_url, display_name`)
        .eq('id', currentUser.id)
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
          email: currentUser.email,
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
    try {
      loading.value = true
      
      // Mimic Vue store: Get user directly
      const { data: { user: currentUser }, error: userError } = await client.auth.getUser()
      if (userError || !currentUser) throw new Error("User not found.")

      const updates = {
        id: currentUser.id,
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
            username: currentUser.email?.split('@')[0],
            avatar_url: '',
            display_name: profileData.displayName,
            website: profileData.website,
            email: currentUser.email
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
    try {
      loading.value = true
      
      // Mimic Vue store: Get user directly
      const { data: { user: currentUser }, error: userError } = await client.auth.getUser()
      if (userError || !currentUser) throw new Error("User not found. Please log in again.")

      const fileExt = file.name.split('.').pop()
      const fileName = `${currentUser.id}.${fileExt}`
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
      
      // Append timestamp to force cache busting
      const publicUrl = `${urlData.publicUrl}?t=${new Date().getTime()}`

      const profileUpdates = {
        id: currentUser.id,
        avatar_url: publicUrl,
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
             email: currentUser.email,
             display_name: '', // Default
             website: '',      // Default
             username: currentUser.email?.split('@')[0]
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