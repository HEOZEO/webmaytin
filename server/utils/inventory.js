const isMissingInventoryTableError = (error) => {
  return error?.code === '42P01' || /relation .*inventory_transactions.* does not exist/i.test(error?.message || '');
};

const logInventoryTransaction = async (db, { productId, quantityChange, reason, adminId, previousStock, newStock, notes }) => {
  try {
    const queryParams = [productId, quantityChange, reason, adminId];
    const columns = ['product_id', 'quantity_change', 'reason', 'admin_id'];
    const placeholders = ['$1', '$2', '$3', '$4'];

    if (previousStock !== undefined && newStock !== undefined) {
      queryParams.push(previousStock, newStock);
      columns.push('previous_stock', 'new_stock');
      placeholders.push('$5', '$6');
    }

    if (notes !== undefined && notes !== null && notes !== '') {
      queryParams.push(notes);
      columns.push('notes');
      placeholders.push(`$${queryParams.length}`);
    }

    const query = `
      INSERT INTO inventory_transactions (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
    `;

    await db.query(query, queryParams);
    return true;
  } catch (error) {
    if (isMissingInventoryTableError(error)) {
      console.warn('Inventory transactions table is not available; skipping inventory log.');
      return false;
    }

    throw error;
  }
};

module.exports = {
  logInventoryTransaction,
  isMissingInventoryTableError
};
