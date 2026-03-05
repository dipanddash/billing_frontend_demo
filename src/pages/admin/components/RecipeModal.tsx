import { useState } from 'react'

const API_BASE = 'https://billingdemo-irsxd.ondigitalocean.app/api/products'

interface Recipe {
  id: string
  ingredient_name: string
  quantity: string
  ingredient: string
}

interface Props {
  product: any
  recipes: Recipe[]
  onClose: () => void
  reloadRecipes: (productId: string) => void
}

const RecipeModal = ({
  product,
  recipes,
  onClose,
  reloadRecipes
}: Props) => {

  const token = localStorage.getItem('access')
  const [newIngredient, setNewIngredient] = useState('')
  const [newQuantity, setNewQuantity] = useState('')

  // ðŸ”¥ UPDATE QUANTITY
  const handleUpdate = async (id: string, quantity: string) => {
    await fetch(`${API_BASE}/recipes/${id}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ quantity })
    })

    reloadRecipes(product.id)
  }

  // ðŸ”¥ DELETE RECIPE ITEM
  const handleDelete = async (id: string) => {
    await fetch(`${API_BASE}/recipes/${id}/`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    reloadRecipes(product.id)
  }

  // ðŸ”¥ ADD NEW RECIPE
  const handleAdd = async () => {
    if (!newIngredient || !newQuantity) return

    await fetch(`${API_BASE}/recipes/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        product: product.id,
        ingredient: newIngredient,
        quantity: newQuantity
      })
    })

    setNewIngredient('')
    setNewQuantity('')
    reloadRecipes(product.id)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-card w-[500px] rounded-lg p-[24px] space-y-[16px]">

        <h2 className="text-lg font-semibold">
          Recipe - {product.name}
        </h2>

        {/* EXISTING INGREDIENTS */}
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {recipes.map(r => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-3 border-b pb-2"
            >
              <span className="text-sm w-[120px]">
                {r.ingredient_name}
              </span>

              <input
                type="number"
                defaultValue={r.quantity}
                onBlur={(e) =>
                  handleUpdate(r.id, e.target.value)
                }
                className="border px-2 py-1 rounded-md w-[100px]"
              />

              <button
                onClick={() => handleDelete(r.id)}
                className="text-red-500 text-xs"
              >
                Delete
              </button>
            </div>
          ))}
        </div>

        {/* ADD NEW INGREDIENT */}
        <div className="border-t pt-3 space-y-2">
          <h3 className="text-sm font-semibold">Add Ingredient</h3>

          <input
            placeholder="Ingredient ID"
            value={newIngredient}
            onChange={(e) => setNewIngredient(e.target.value)}
            className="w-full border px-2 py-1 rounded-md"
          />

          <input
            placeholder="Quantity"
            type="number"
            value={newQuantity}
            onChange={(e) => setNewQuantity(e.target.value)}
            className="w-full border px-2 py-1 rounded-md"
          />

          <button
            onClick={handleAdd}
            className="w-full gradient-primary text-white py-2 rounded-md text-sm"
          >
            Add Ingredient
          </button>
        </div>

        {/* CLOSE BUTTON */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-[16px] py-[8px] border rounded-md text-sm"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  )
}

export default RecipeModal


