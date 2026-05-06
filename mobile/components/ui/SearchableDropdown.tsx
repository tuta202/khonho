import { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { Colors } from '../../constants/colors'

export interface DropdownOption {
  label: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any
}

interface SearchableDropdownProps {
  placeholder: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any
  displayValue?: string
  options: DropdownOption[]
  onSelect: (value: DropdownOption) => void
  searchable?: boolean
  onSearch?: (text: string) => void
  loading?: boolean
  disabled?: boolean
}

export function SearchableDropdown({
  placeholder,
  value,
  displayValue,
  options,
  onSelect,
  searchable = false,
  onSearch,
  loading = false,
  disabled = false,
}: SearchableDropdownProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [localSearch, setLocalSearch] = useState('')

  const selected = options.find((o) => o.value === value)
  const fieldLabel = displayValue ?? selected?.label ?? null

  const filteredOptions = onSearch
    ? options
    : localSearch
    ? options.filter((o) => o.label.toLowerCase().includes(localSearch.toLowerCase()))
    : options

  const handleSearch = (text: string) => {
    setLocalSearch(text)
    onSearch?.(text)
  }

  const handleSelect = (opt: DropdownOption) => {
    onSelect(opt)
    setModalOpen(false)
    setLocalSearch('')
    if (onSearch) onSearch('')
  }

  const open = () => {
    if (!disabled) {
      setLocalSearch('')
      setModalOpen(true)
    }
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.field, disabled && styles.fieldDisabled]}
        onPress={open}
        activeOpacity={0.7}
      >
        <Text style={[styles.fieldText, !fieldLabel && styles.placeholder]} numberOfLines={1}>
          {fieldLabel ?? placeholder}
        </Text>
        {loading ? (
          <ActivityIndicator size="small" color={Colors.gray[400]} />
        ) : (
          <Feather name="chevron-down" size={16} color={Colors.gray[400]} />
        )}
      </TouchableOpacity>

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={() => setModalOpen(false)}
          activeOpacity={1}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} />
        </TouchableOpacity>

        <View style={styles.sheet}>
          {/* Handle */}
          <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 8 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.gray[300] }} />
          </View>

          {searchable && (
            <View style={styles.searchRow}>
              <Feather name="search" size={15} color={Colors.gray[400]} />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm kiếm..."
                placeholderTextColor={Colors.gray[400]}
                value={localSearch}
                onChangeText={handleSearch}
                autoFocus
              />
            </View>
          )}

          {loading ? (
            <ActivityIndicator color={Colors.navy.DEFAULT} style={{ paddingVertical: 24 }} />
          ) : (
            <FlatList
              data={filteredOptions}
              keyExtractor={(_, i) => String(i)}
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 320 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.optionRow, item.value === value && styles.optionRowActive]}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.optionText, item.value === value && styles.optionTextActive]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                  {item.value === value && <Feather name="check" size={16} color={Colors.navy.DEFAULT} />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={{ textAlign: 'center', color: Colors.gray[400], paddingVertical: 16, fontSize: 14 }}>
                  Không có kết quả
                </Text>
              }
            />
          )}
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  field: {
    borderWidth: 1,
    borderColor: Colors.gray[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    marginTop: 4,
  },
  fieldDisabled: { backgroundColor: Colors.gray[50], borderColor: Colors.gray[200] },
  fieldText: { fontSize: 15, color: Colors.gray[900], flex: 1, marginRight: 8 },
  placeholder: { color: Colors.gray[400] },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.gray[900] },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[50],
  },
  optionRowActive: { backgroundColor: '#eff6ff' },
  optionText: { fontSize: 15, color: Colors.gray[800], flex: 1, marginRight: 8 },
  optionTextActive: { color: Colors.navy.DEFAULT, fontWeight: '600' },
})
