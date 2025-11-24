import { reactive } from 'vue'
import { supabase } from './supabase'

/**
 * A reactive store to manage user profile data and interactions.
 */
export const store = reactive({
  profile: null,
  loading: false,

  /**
   * Fetches the current user's profile from the 'profiles' table.
   */
  async fetchProfile() {
    try {
      this.loading = true
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      if (!sessionData.session) return

      const { user } = sessionData.session
      const { data, error, status } = await supabase
        .from('profiles')
        .select(`username, website, avatar_url`)
        .eq('id', user.id)
        .single()

      if (error && status !== 406) throw error

      if (data) {
        this.profile = {
          username: data.username,
          website: data.website,
          avatar_url: data.avatar_url,
        }
      }
    } catch (error) {
      alert(error.message)
    } finally {
      this.loading = false
    }
  },

  /**
   * Uploads a new avatar file to the 'avatars' bucket and updates the user's profile.
   * @param {File} file The avatar file to upload.
   */
  async uploadAvatar(file) {
    try {
      this.loading = true
      if (!file) {
        throw new Error('You must select an image file to upload.')
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw userError || new Error('User not found. Please log in again.')
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}.${fileExt}`
      const filePath = `${fileName}`

      let { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, {
        cacheControl: '3600',
        upsert: true, // Overwrite existing file
      })

      if (uploadError) {
        throw uploadError
      }

      // Get the public URL of the uploaded file
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath)
      
      const profileUpdates = {
        id: user.id,
        avatar_url: urlData.publicUrl,
        updated_at: new Date(),
      }

      // Ensure username is present for the upsert, especially for new profiles
      if (this.profile && this.profile.username) {
          profileUpdates.username = this.profile.username;
      } else {
          // This fallback should ideally be handled by the trigger, but as a safeguard
          // Ensure it matches the format of the trigger-generated username if possible
          profileUpdates.username = 'user_' + user.id.substring(0, 8);
      }

      let { error: updateError } = await supabase.from('profiles').upsert(profileUpdates)
      if (updateError) {
        throw updateError
      }

      // Update the local profile store if it exists
      if (this.profile) {
        this.profile.avatar_url = urlData.publicUrl
      } else {
        // If profile was just created, update the local store too
        this.profile = { ...profileUpdates, avatar_url: urlData.publicUrl };
      }
      alert('Avatar updated successfully!')

    } catch (error) {
      alert(error.message)
    } finally {
      this.loading = false
    }
  },
})
