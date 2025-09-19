from django.db import models


class Category(models.Model):
    key = models.SlugField(unique=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='categories/', null=True, blank=True)
    order_index = models.IntegerField(default=0)

    def __str__(self):
        return self.name


class Product(models.Model):
    name = models.CharField(max_length=255)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='products')
    description = models.TextField(blank=True)
    specs = models.JSONField(default=list, blank=True)
    features = models.JSONField(default=list, blank=True)
    highlights = models.JSONField(default=list, blank=True)
    main_image = models.ImageField(upload_to='products/main/', null=True, blank=True)
    in_stock = models.BooleanField(default=True)
    stock = models.IntegerField(null=True, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    discounted_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    discount = models.IntegerField(default=0)
    student_discount = models.IntegerField(default=0)

    def __str__(self):
        return self.name

    class Meta:
        # Ensure deterministic ordering for pagination and listings
        ordering = ['-id']


class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='products/images/')
    is_main = models.BooleanField(default=False)

    def __str__(self):
        return f"Image for {self.product_id}"
