def checkout(order):
    # AUTO-OPS Fix: Add validation to prevent KeyError
    if not order or not isinstance(order, dict):
        raise ValueError("Invalid order: must be a dictionary")
    if "customer" not in order:
        raise ValueError("Invalid order: missing customer information")
        if not isinstance(order["customer"], dict) or "id" not in order["customer"]:
        raise ValueError("Invalid customer: missing ID")
    return order["customer"]["id"]  # Fixed: added validation

if __name__ == "__main__":
    data = {}  # guaranteed KeyError
    print(checkout(data))