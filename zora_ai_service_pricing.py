def calculate_ai_service_price(company_size, annual_revenue):
    base_price = 1000  # Base annual license in DKK

    # Adjust price based on company size
    size_multiplier = {
        'micro': 0.5,
        'small': 1.0,
        'medium': 2.0,
        'large': 4.0,
        'enterprise': 6.0
    }.get(company_size.lower(), 1.0)

    # Revenue-based discount or premium
    if annual_revenue < 500000:
        revenue_adjustment = 0.75
    elif annual_revenue < 2000000:
        revenue_adjustment = 1.0
    elif annual_revenue < 10000000:
        revenue_adjustment = 1.25
    else:
        revenue_adjustment = 1.5

    final_price = base_price * size_multiplier * revenue_adjustment
    return round(final_price, 2)


# Example usage
if __name__ == "__main__":
    size = input("Virksomhedens størrelse (micro, small, medium, large, enterprise): ")
    revenue = float(input("Virksomhedens årlige omsætning i DKK: "))
    price = calculate_ai_service_price(size, revenue)
    print(f"Årlig pris for ZORA AI-as-a-Service: {price} DKK")
